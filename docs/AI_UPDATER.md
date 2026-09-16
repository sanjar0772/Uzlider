# AI Updater — to'liq reja va ishlash qo'llanmasi

> **Maqsad:** "Updater" (track-and-trace / check-calls) rolini tizim ichidagi AI
> bilan almashtirish. Avval **1 ta updater** o'rniga pilot sifatida joriy qilamiz,
> to'liq mukammal ishlagach — qolgan updaterlarga ham yoyamiz.

---

## 1. Updater aslida nima qiladi? (roli tushunish)

Amerika yuk tashish (freight) biznesida **updater** = *track & trace / check-call*
xodimi. Uning kunlik ishi 3 ta narsadan iborat:

1. **Haydovchi (truck) bilan bog'lanish** — belgilangan vaqtlarda:
   - Yuk biriktirilgach: "Yukni oldingmi? Pickup appointment nechada?"
   - Ertalabki check-call: "Qayerdasan? Pickup'ga ETA qancha?"
   - Pickup'da: "Yuklandingmi? Necha soatda yuklashdi? Detention bormi?"
   - Yo'lda: har 2–4 soatda (yoki broker talab qilgan kadensiyada) joylashuv + ETA
   - Delivery yaqinlashganda: "Receiver'ga ETA qancha?"
   - Delivery'da: "Tushirdingmi? Necha soatda? BOL/POD imzolandimi?"

2. **Brokerga xabar berish (update)** — broker talab qilgan formatda/kanalda:
   - Ko'p brokerlar kuniga 1–2 marta + har bir milestone'da update kutadi
   - Format: `Load #12345 — pickup 08:15 CT, hozir Amarillo TX yaqinida, grafikda,
     delivery ETA ertaga 10:00 MT`
   - Ba'zilar portal orqali (Macropoint / FourKites / project44), ba'zilar email/SMS

3. **Hammasini TMS'ga yozish** — status o'zgarishi, joylashuv, izohlar (`LoadUpdate`)

4. **Muammoni yuqoriga uzatish (escalation)** — dispatcher/menejerga:
   - Haydovchi X soat javob bermasa
   - Buzilish / avария / kechikish / appointment'ni o'tkazib yuborish xavfi
   - Detention yig'ilib borsa

**Bizning AI updater aynan shu 4 ishni bajaradi.**

---

## 2. Tizimda hozir nima bor (mavjud poydevor)

| Kerakli narsa | Tizimda bormi? | Qayerda |
|---|---|---|
| Haydovchi bilan aloqa kanali | ✅ Telegram (`telegramChatId`) | `src/lib/telegram.ts`, `api/telegram/webhook` |
| GPS joylashuv | ✅ `Driver.lastLat/lastLng`, `LocationPing` trail | `api/driver/location` |
| Yuk holati / lifecycle | ✅ `Load.status`, `LoadUpdate`, `LoadStop` | `prisma/schema.prisma` |
| AI (Claude) + tool-schema | ✅ hujjat ajratishda ishlatilgan | `src/lib/ai.ts` |
| Broker'ga broadcast | ✅ dispatch guruhga Telegram | `notifyTelegram()` |
| UPDATER roli + ruxsat | ✅ `can.updateStatus` | `src/lib/constants.ts` |
| **Scheduler / cron** | ❌ **yo'q — qo'shiladi** | — |
| **Check-call holatini kuzatish** | ❌ **yo'q — qo'shiladi** | — |
| **AI suhbat "miyasi"** | ❌ **yo'q — qo'shiladi** | — |

Ya'ni 70% poydevor tayyor. Bizga 3 ta yangi narsa kerak: **(a) rejalashtiruvchi
(cron)**, **(b) check-call holat maydonlari**, **(c) AI suhbat miyasi**.

---

## 3. AI Updater qanday ishlaydi (arxitektura)

> **Ko'p kanalli (multi-channel) tamoyil:** AI'ning **miyasi bitta** (Claude +
> umumiy tool'lar), **kanal esa almashtiriladigan**. Bugun 2 kanal:
> **(1) Telegram matn** va **(2) Telefon (ovozli qo'ng'iroq)** — pastda 10-bo'lim.
> Ikkalasi ham bir xil tool'larni chaqiradi: `get_load_context`,
> `record_tracking_update`, `create_broker_update`, `escalate`. Shu sabab bir
> marta yozilgan "miya" har ikki kanalda ishlaydi.

Uch qismli aylanma (loop):

```
        ┌─────────────────────────────────────────────────────────┐
        │  A. CRON (har ~15 daqiqa)  →  /api/cron/updater          │
        │  Aktiv yuklarni ko'rib chiqadi. Check-call vaqti         │
        │  kelganini aniqlaydi (kadensiya + milestone + status).   │
        │  Kerak bo'lsa → haydovchiga Telegram'da savol yuboradi.  │
        └───────────────────────────┬─────────────────────────────┘
                                     │
        ┌────────────────────────────▼────────────────────────────┐
        │  B. INBOUND (haydovchi javobi)  →  telegram/webhook      │
        │  Erkin matn ("OKC o'tdim, 3 ga yetkazaman") → AI miyasi  │
        │  strukturaga aylantiradi: status? location? ETA? issue?  │
        │  → LoadUpdate yaratadi, statusni ko'chiradi, javob beradi │
        └───────────────────────────┬─────────────────────────────┘
                                     │
        ┌────────────────────────────▼────────────────────────────┐
        │  C. BROKER UPDATE + ESCALATION                           │
        │  Broker uchun tayyor matn yasaydi (1-fazada: dispatch    │
        │  guruhga draft/approval; 2-fazada: avto email/portal).   │
        │  Muammo bo'lsa → 🚨 dispatcher/menejerga eskalatsiya.    │
        └─────────────────────────────────────────────────────────┘
```

### 3.1. AI "miya" — tool schema (Claude)

`src/lib/ai.ts` dagi `extractLoadFromDocument` naqshining aynan o'xshashi.
Yangi funksiya `interpretDriverMessage()` Claude'ga quyidagilarni beradi:

- **Kontekst:** haydovchining aktiv yuki(lari), joriy status, oxirgi GPS joylashuv,
  pickup/delivery appointment vaqtlari, oxirgi check-call vaqti, driver tili
- **Kirish:** haydovchining erkin matni (Telegram xabari)
- **Tool:** `record_tracking_update` — majburiy strukturali javob:

```ts
{
  loadRef: string | null,        // qaysi yuk (agar bir nechta bo'lsa)
  newStatus: LoadStatus | null,  // faqat asosli bo'lsa (loaded→IN_TRANSIT)
  location: string | null,       // "City, ST" — faqat haydovchi aytgani/GPS
  etaText: string | null,        // "ertaga 10:00" kabi
  etaAt: string | null,          // ISO, agar aniqlanса
  note: string | null,           // detention, BOL imzosi va h.k.
  issue: "none"|"late"|"breakdown"|"accident"|"detention"|"other",
  needsEscalation: boolean,
  replyToDriver: string,         // haydovchiga javob (uning tilida)
  brokerUpdateText: string | null // brokerga tayyor update matni
}
```

**Muhim guardrail'lar (AI xato qilmasligi uchun):**
- Joylashuv/ETA'ni **hech qachon o'zi to'qib chiqarmaydi** — faqat haydovchi
  aytgani yoki GPS'dan. Aniqlik yo'q bo'lsa → `null` va haydovchidan so'raydi.
- Status faqat **haqiqiy o'tishlarga** ko'chadi (masalan `ASSIGNED→IN_TRANSIT`
  faqat "yuklandim/yo'ldaman" bo'lsa; `→DELIVERED` faqat "tushirdim/bo'shadim").
- **Broker'ga tashqi xabar 1-fazada avtomatik yuborilmaydi** — inson tasdiqlaydi
  (bu "send message on user's behalf" — tashqi ta'sir, ruxsat kerak).
- Haydovchi tilini aniqlaydi (o'zbek/rus/ingliz) va o'sha tilda javob beradi.
- **Idempotent:** bitta check-call ikki marta yuborilmaydi (`lastCheckCallAt`).

### 3.2. Cron — check-call vaqtini aniqlash mantig'i

`/api/cron/updater` (maxfiy token bilan himoyalangan) har ~15 daqiqada ishlaydi.
Har bir **AI-tracked** aktiv yuk (`trackingEnabled && status ∈ {ASSIGNED,IN_TRANSIT}`)
uchun:

```
nextCheckCallAt kelganmi?  yoki
pickup appointment 2 soat ichidami va hali IN_TRANSIT emasmi?  yoki
delivery appointment 3 soat ichidami?
   → HA bo'lsa: haydovchiga check-call yuboradi, lastCheckCallAt=now,
     nextCheckCallAt=now+cadence, missedCheckCalls++ (javob kelmaguncha)
```

**Cron manbasi (Railway serverless):** ilova serverless bo'lgani uchun ichki
`setInterval` ishonchsiz. Shuning uchun tashqi rejalashtiruvchi:
- **Railway Cron** (alohida service, `curl` bilan endpoint'ni chaqiradi), yoki
- **cron-job.org** / **GitHub Actions** (bepul, har 15 daq `curl`)
- Endpoint `Authorization: Bearer $CRON_SECRET` bilan himoyalanadi.

### 3.3. Escalation

- `missedCheckCalls >= 2` (masalan 8 soat javob yo'q) → `Notification`
  (forRole=DISPATCHER/MANAGER) + dispatch guruhga 🚨
- `issue ∈ {breakdown, accident, late}` → darhol eskalatsiya
- Eskalatsiya bo'lsa AI tinchlanadi (spam qilmaydi), inson qo'lga oladi

---

## 4. Ma'lumotlar modeli o'zgarishlari (Prisma)

### 4.1. `Load` modeliga qo'shiladigan maydonlar

```prisma
model Load {
  // ... mavjud maydonlar ...

  // ---- AI Updater (track & trace) ----
  trackingEnabled     Boolean   @default(false) // AI updater bu yukni boshqaradimi
  checkCallCadenceMins Int      @default(240)   // broker talab qilgan kadensiya (daq)
  lastCheckCallAt     DateTime?                  // oxirgi savol yuborilgan vaqt
  lastDriverReplyAt   DateTime?                  // haydovchidan oxirgi javob
  nextCheckCallAt     DateTime?                  // keyingi savol vaqti
  missedCheckCalls    Int       @default(0)      // ketma-ket javobsiz check-call'lar
  etaText             String?                    // "ertaga 10:00 MT"
  etaAt               DateTime?                  // structured ETA (agar bor)
  trackingIssue       String?                    // none|late|breakdown|accident|detention
}
```

### 4.2. Yangi model — brokerga update navbati (approval workflow)

```prisma
enum BrokerUpdateStatus { DRAFT APPROVED SENT FAILED }

model BrokerUpdate {
  id        String   @id @default(cuid())
  loadId    String
  load      Load     @relation(fields: [loadId], references: [id], onDelete: Cascade)
  text      String                          // brokerga tayyor matn
  channel   String   @default("telegram")   // telegram|email|portal
  status    BrokerUpdateStatus @default(DRAFT)
  createdByAi Boolean @default(true)
  approvedByName String?
  sentAt    DateTime?
  createdAt DateTime @default(now())

  @@index([loadId])
  @@index([status])
}
```
> `Load` modeliga `brokerUpdates BrokerUpdate[]` relation qo'shiladi.

### 4.3. `CompanySettings` ga qo'shiladigan sozlamalar

```prisma
model CompanySettings {
  // ... mavjud ...
  aiUpdaterEnabled     Boolean @default(false) // AI updater umumiy tugma
  aiUpdaterAutoBroker  Boolean @default(false) // brokerga avto-yuborish (2-faza)
  aiUpdaterName        String  @default("AI Updater") // LoadUpdate.authorName
  aiUpdaterCadenceMins Int     @default(240)   // default kadensiya
  aiUpdaterQuietStart  Int?    // masalan 22 (haydovchini kechasi bezovta qilmaslik)
  aiUpdaterQuietEnd    Int?    // masalan 6
  aiUpdaterEscalateAfter Int   @default(2)     // nechta missed check-call'dan keyin
}
```

### 4.4. "AI Updater" identifikatori

`LoadUpdate.authorName` da inson bilan aralashmasligi uchun AI yozuvlariga
`authorName = settings.aiUpdaterName` ("AI Updater 🤖"), `authorId = null`
qo'yiladi. Ixtiyoriy: bitta system `User` (role=UPDATER, email=`ai-updater@system`)
yaratib, unga bog'lash — audit uchun tozaroq.

---

## 5. Fayl-bo'yicha implementatsiya rejasi (build checklist)

### Faza 0 — Poydevor
- [ ] `prisma/schema.prisma` — 4.1, 4.2, 4.3 maydonlarini qo'shish
- [ ] `prisma db push` (yoki migration)
- [ ] `src/lib/constants.ts` — `BROKER_UPDATE_STATUSES`, `TRACKING_ISSUES` enum'lari
- [ ] `.env.example` — `CRON_SECRET` qo'shish

### Faza 1 — AI miya + inbound + cron (PILOT)
- [ ] `src/lib/updater.ts` — asosiy mantiq:
  - `interpretDriverMessage(ctx, text)` → Claude tool-call (3.1 schema)
  - `applyTrackingUpdate(load, result, user)` → `LoadUpdate` yaratadi, statusni
    ko'chiradi, `etaText`/`lastDriverReplyAt`/`missedCheckCalls=0` yangilaydi,
    kerak bo'lsa `BrokerUpdate` (DRAFT) yaratadi, eskalatsiya qiladi
  - `buildCheckCallMessage(load, driverLang)` → savol matni
  - `dueLoadsForCheckCall()` → cron uchun tanlov
- [ ] `src/lib/ai.ts` — `interpretDriverMessage` uchun Claude chaqiruvi (yangi tool)
- [ ] `src/app/api/telegram/webhook/route.ts` — linked DRIVER'dan **erkin matn**
  kelganda (buyruq emas) `interpretDriverMessage` → `applyTrackingUpdate` → javob
- [ ] `src/app/api/cron/updater/route.ts` — `Bearer CRON_SECRET`, `dueLoadsForCheckCall`,
  har biriga check-call yuboradi + escalation
- [ ] `src/app/api/loads/[id]/route.ts` — `trackingEnabled`, `checkCallCadenceMins`
  ni tahrirlashga ruxsat (dispatcher)
- [ ] **UI (minimal):** `src/app/dashboard/loads/[id]/page.tsx` — "🤖 AI Updater"
  toggle + kadensiya + pending `BrokerUpdate` DRAFT'ini **Approve & Send** tugmasi
- [ ] `src/app/api/broker-updates/[id]/route.ts` — DRAFT'ni APPROVE→SEND (dispatch
  guruhga yuboradi), 1-fazada shu yerda inson tasdiqlaydi

### Faza 2 — Avtomatlashtirish
- [ ] GPS'dan avto-ETA (haydovchi javob bermasa `lastLat/lng` + route bilan)
- [ ] `aiUpdaterAutoBroker=true` bo'lsa DRAFT'ni avto-APPROVE (ishonch mezoni bilan)
- [ ] Broker email kanali (`channel="email"`) — broker kontaktiga yuborish
- [ ] Multi-load bir haydovchida, quiet hours, til aniqlash yaxshilash

### Faza 3 — Kengaytirish
- [ ] Barcha updaterlarga yoyish
- [ ] Portal integratsiyalari (Macropoint/FourKites/project44)
- [ ] SMS/ovozli check-call (Twilio)
- [ ] Analitika: AI updater qancha yukni boshqardi, o'rtacha javob vaqti, eskalatsiyalar

---

## 6. Pilot: "1 ta updater o'rniga" qanday joriy qilinadi

**G'oya:** hozir 1 ta jonli updater boshqaradigan yuklarni AI'ga o'tkazamiz,
qolgani o'zgarishsiz qoladi. Jonli updater **kuzatib turadi** va istagan payt
qo'lga oladi.

1. Settings → **AI Updater'ni yoqish** (`aiUpdaterEnabled=true`), lekin
   `aiUpdaterAutoBroker=false` (broker update'lari inson tasdig'i bilan).
2. Pilot uchun tanlangan yuklarda **🤖 AI Updater toggle** ni yoqish
   (`trackingEnabled=true`). Faqat 1 haydovchi/1 dispatcher yuklaridan boshlang.
3. Haydovchilar Telegram'da `/link CODE` bilan bog'langan bo'lishi shart (Profile'da
   kod olinadi). GPS ixtiyoriy, lekin yoqilса ETA aniqroq.
4. Cron'ni ulash (Railway Cron yoki cron-job.org) — har 15 daqiqa.
5. 1–2 hafta kuzatuv: AI check-call yuboradi, javoblarni yozadi, broker draft'larini
   tayyorlaydi; inson faqat **Approve & Send** bosadi va xatolarni belgilaydi.
6. Aniqlik yetarli bo'lgach → `aiUpdaterAutoBroker=true` va boshqa yuklarga yoyish.

**Muvaffaqiyat mezonlari (pilotdan chiqish sharti):**
- Haydovchi javoblarining ≥95% to'g'ri strukturaga aylantirilgan
- Noto'g'ri status ko'chirish = 0
- Broker draft'lari ≥90% tahrirsiz yuborilgan
- Barcha kechikish/buzilish holatlari to'g'ri eskalatsiya qilingan

---

## 7. Xavfsizlik va cheklovlar (guardrails)

| Xavf | Chora |
|---|---|
| AI joylashuv/ETA to'qib chiqarishi | Faqat haydovchi so'zi yoki GPS; yo'q bo'lsa `null` + so'rov |
| Noto'g'ri status ko'chirish | Faqat validatsiyalangan o'tishlar; `isLoadStatus` |
| Brokerga xato/ruxsatsiz xabar | 1-fazada **majburiy inson tasdig'i** (DRAFT→Approve) |
| Haydovchini kechasi bezovta qilish | Quiet hours (`quietStart/End`) |
| Check-call spam | `nextCheckCallAt`, idempotentlik |
| Prompt injection (haydovchi matni) | Matn **data** sifatida, tool-schema chegaralaydi; hech qanday buyruq bajarilmaydi |
| Cron endpoint suiiste'moli | `Bearer CRON_SECRET` |
| Telegram xatosi asosiy oqimni buzishi | Barcha Telegram chaqiruvlari fire-and-forget, throw qilmaydi (mavjud naqsh) |

---

## 8. Kerakli environment o'zgaruvchilari

```
ANTHROPIC_API_KEY="..."        # AI miya uchun (mavjud)
LOAD_EXTRACT_MODEL="claude-sonnet-5"  # suhbat uchun ham shu (mavjud)
CRON_SECRET="uzun-tasodifiy-satr"      # YANGI — cron endpoint himoyasi
TELEGRAM_WEBHOOK_SECRET="..."  # mavjud, tavsiya etiladi
# --- Ovozli kanal (10-bo'lim) ---
VOICE_PROVIDER="vapi"          # vapi | retell
VAPI_API_KEY="..."             # ovozli agent platformasi kaliti
VAPI_WEBHOOK_SECRET="..."      # webhook imzosini tekshirish
VOICE_PHONE_NUMBER="+1..."     # AI updater'ning telefon raqami
DISPATCHER_TRANSFER_NUMBER="+1..." # jonli odamga o'tkazish (warm transfer)
```
Broker/haydovchi aloqasi TMS ichida (Settings) sozlanadi — bot token, dispatch
chat id (mavjud).

---

## 9. Telefon (ovozli) kanal — AI qo'ng'iroq qiladi va qabul qiladi

Updater ishining katta qismi **telefon**da: brokerlar qo'ng'iroq qilib status
so'raydi, haydovchilar gaplashishni afzal ko'radi. AI updater **ovozda** ham
ishlashi kerak — **ikki yo'nalishda**:

- **Outbound (AI qo'ng'iroq qiladi):** cron check-call vaqti kelganda haydovchiga
  qo'ng'iroq qiladi ("Salom, qayerdasan? Delivery'ga ETA qancha?"), javobni
  tushunadi, TMS'ga yozadi.
- **Inbound (AI qabul qiladi):** broker yoki haydovchi AI raqamiga qo'ng'iroq
  qiladi → AI kim ekanini (caller ID) aniqlaydi, yuk holatini aytadi yoki update
  qabul qiladi.

### 9.1. Nega platforma kerak (muhim texnik haqiqat)

- **Claude'da realtime ovoz (audio) API yo'q** — u matn modeli. Ovoz uchun
  realtime **STT → LLM → TTS** aylanmasi kerak.
- Shuning uchun **ovozli agent platformasi** ishlatiladi: u telefoniya + nutq
  aylanmasini **o'zi hostlaydi**, **miya sifatida Claude'ni** chaqiradi, **tool
  sifatida bizning API'ni** chaqiradi. "AI = Claude, tizim ichida" tamoyili
  buzilmaydi — qaror va mantiq baribir Claude + bizning DB orqali.
- **Serverless mos keladi:** platforma realtime qismni ushlab turadi, bizning
  Next.js faqat oddiy HTTP webhook beradi → Railway'da muammosiz. (DIY Twilio
  Media Streams doimiy websocket server talab qiladi — hozircha shart emas.)

### 9.2. Platforma tanlash

| Platforma | Kuchli tomoni | Izoh |
|---|---|---|
| **Vapi** (tavsiya) | Custom LLM (Claude/Anthropic), custom ovozlar (ElevenLabs/Azure/Cartesia), tool-calling `server URL` orqali, call transfer, recording | Bizning naqshga eng mos |
| **Retell AI** | Past kechikish, function-calling, transfer | Yaxshi muqobil |
| Bland.ai | Turnkey, korporativ | Custom LLM'da moslashuv kamroq |

Ikkalasi ham **Claude'ni LLM sifatida** va **Azure ovozlarini** (o'zbek uchun)
ulashga imkon beradi. Boshlash uchun **Vapi**.

### 9.3. Til masalasi (ochiq haqiqat)

| Kim | Til | Sifat | Provayder |
|---|---|---|---|
| Broker | Ingliz | ⭐ A'lo | Har qanday (Deepgram + ElevenLabs) |
| Haydovchi | Rus | ⭐ A'lo | Har qanday |
| Haydovchi | **O'zbek** | ⚠️ **Cheklangan** | **Azure Speech `uz-UZ`** eng ishonchli |

**Tavsiya:** ovozni fazama-faza yoqamiz — avval **ingliz (broker)** va **rus
(haydovchi)**, keyin **o'zbek** (Azure ovozi bilan, sinovdan o'tkazib). Har bir
haydovchida `preferredLang` maydoni ovoz tilini belgilaydi.

### 9.4. Oqimlar

**Outbound (haydovchiga check-call):**
```
cron → check-call vaqti → POST Vapi "create call" (driver.phone, assistant=updater,
   metadata={loadId, lang})
 → Vapi qo'ng'iroq qiladi, Claude suhbat quradi
 → Claude tool chaqiradi: get_load_context(loadId), record_tracking_update(...)
 → qo'ng'iroq tugagach Vapi bizga "end-of-call-report" webhook yuboradi
 → biz CallLog yozamiz, transkript + structured update saqlaymiz
```

**Inbound (broker/haydovchi qo'ng'irog'i):**
```
qo'ng'iroq → VOICE_PHONE_NUMBER → Vapi → webhook: "assistant-request"
 → biz caller ID'ni Customer.phone / Driver.phone bilan solishtiramiz
 → mos yuk (lar) kontekstini qaytaramiz → Claude status aytadi / update oladi
 → murakkab bo'lsa yoki "odam chaqir" desa → warm transfer → dispatcher raqami
```

### 9.5. Umumiy tool'lar (Telegram bilan bir xil miya)

Ovoz ham, matn ham shu HTTP tool'larni chaqiradi (`/api/voice/tool`):
- `get_load_context(loadRef|driverPhone|customerPhone)` → yuk holati, ETA, appt
- `record_tracking_update({...})` → 3.1 dagi bir xil schema (LoadUpdate yaratadi)
- `create_broker_update({loadId, text})` → DRAFT (1-fazada inson tasdig'i)
- `escalate({loadId, reason})` → Notification + dispatch guruh 🚨
- `transfer_to_human()` → warm transfer (faqat ovozda)

### 9.6. Qonuniy / xavfsizlik (ovozga xos — MUHIM)

| Talab | Chora |
|---|---|
| **Qo'ng'iroq yozib olish roziligi** (AQSh: ba'zi shtatlarda 2-tomon roziligi — CA, PA, FL...) | Suhbat boshida majburiy e'lon: *"This call is recorded and you're speaking with an automated assistant."* |
| **AI ekanini oshkor qilish** (masalan California bot-disclosure qonuni) | Xuddi shu boshlang'ich e'londa AI ekani aytiladi |
| Avtomatik qo'ng'iroqlar (TCPA/quiet hours) | Faqat o'z haydovchi/brokeringizga; `quietStart/End` hurmat qilinadi |
| Webhook soxtalashtirish | `VAPI_WEBHOOK_SECRET` imzo tekshiruvi |
| AI status/ETA to'qishi | Faqat kontekst/haydovchi so'zidan; yo'q bo'lsa so'raydi; brokerga tashqi yuborish 1-fazada inson tasdig'i bilan |
| Noaniq/janjalli qo'ng'iroq | `transfer_to_human()` — jonli dispatcherga |

### 9.7. Ma'lumotlar modeli — ovoz uchun qo'shimchalar

```prisma
enum CallDirection { INBOUND OUTBOUND }
enum CallOutcome { COMPLETED NO_ANSWER VOICEMAIL FAILED TRANSFERRED }

model CallLog {
  id          String   @id @default(cuid())
  direction   CallDirection
  provider    String   @default("vapi")
  providerCallId String? @unique
  fromNumber  String?
  toNumber    String?
  loadId      String?
  load        Load?    @relation(fields: [loadId], references: [id])
  driverId    String?
  driver      Driver?  @relation(fields: [driverId], references: [id])
  customerId  String?
  customer    Customer? @relation(fields: [customerId], references: [id])
  lang        String?
  outcome     CallOutcome?
  durationSec Int?
  transcript  String?  // to'liq transkript
  summary     String?  // Claude qisqacha xulosasi
  recordingUrl String?
  createdAt   DateTime @default(now())

  @@index([loadId])
  @@index([driverId])
  @@index([createdAt])
}
```
Qo'shimcha maydonlar:
- `Driver.preferredLang String? @default("ru")` — ovoz/matn tili
- `Driver` va `Customer` da `phone` allaqachon bor (caller ID uchun ishlatiladi)
- `CompanySettings`: `voiceEnabled Boolean @default(false)`,
  `voiceInboundEnabled`, `voiceOutboundEnabled`, `voiceProvider`,
  `voiceAssistantId`, `voiceRecordDisclosure String` (e'lon matni)

### 9.8. Yangi endpointlar

- `POST /api/voice/tool` — Vapi function-calling'ni bizning tool'larga bog'laydi
- `POST /api/voice/webhook` — status/end-of-call-report → `CallLog` yozadi
- `POST /api/voice/outbound` (ichki) — cron shu orqali outbound qo'ng'iroq boshlaydi
- `src/lib/voice.ts` — Vapi API o'rami (createCall, verifyWebhook), CallLog helper

### 9.9. Ovoz — fazalar

- **Faza V0:** Vapi akkaunt + raqam + assistant (Claude LLM, ingliz/rus ovoz),
  `CallLog` modeli, `/api/voice/tool` + `/api/voice/webhook`
- **Faza V1 (inbound):** broker/haydovchi qo'ng'iroq qiladi → AI status aytadi +
  update oladi + warm transfer. Eng katta qiymat, eng oson (ingliz).
- **Faza V2 (outbound):** cron check-call'ni ovozda ham qiladi (haydovchi Telegram'da
  javob bermasa → qo'ng'iroq). Rus tilida.
- **Faza V3:** o'zbek ovozi (Azure), SMS fallback, voicemail qoldirish, ko'p yuk

### 9.10. Xarajat (taxminiy)

Ovoz **daqiqasiga** to'lanadi (telefoniya + STT + TTS + LLM). Odatda ~$0.05–0.15/daq
atrofida (platforma + ovoz sifatiga qarab). Bir check-call ~1–2 daqiqa. Kuniga
50 qo'ng'iroq ≈ oyiga qo'lда hisoblab byudjet belgilanadi. Telegram matn deyarli
tekin — shuning uchun **avval Telegram, telefon esa kerak bo'lganda** ishlaydi
(masalan haydovchi 30 daq javob bermasa → qo'ng'iroq).

---

## 10. Keyingi qadam

Ikki yo'nalish parallel emas — **ketma-ket**, xavfni kamaytirib:

1. **Faza 0** (schema + settings) — matn va ovoz uchun umumiy poydevor
   (`prisma/schema.prisma`, `constants.ts`, settings, `prisma db push`).
2. **Faza 1** — Telegram matn kanalida to'liq AI updater (miya + tool'lar + cron),
   1 haydovchida pilot. Ovoz miyasini shu yerda tayyorlaymiz.
3. **Faza V1** — telefon (inbound, ingliz/rus) — xuddi shu miyani ovozga ulaymiz.
4. Aniqlik yetgach — outbound ovoz, o'zbek tili, va boshqa updaterlarga yoyish.

Tasdiqlansangiz, **Faza 0** dan boshlayman.
