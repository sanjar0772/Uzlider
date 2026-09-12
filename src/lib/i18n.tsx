"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "ru" | "uz";

type Dict = Record<string, string>;

const translations: Record<Lang, Dict> = {
  en: {
    appName: "Uzlider TMS",
    tagline: "Truck Management System",
    // auth
    signIn: "Sign in",
    signOut: "Sign out",
    email: "Email",
    password: "Password",
    loginTitle: "Sign in to your account",
    loginError: "Invalid email or password",
    demoAccounts: "Demo accounts",
    // nav
    dashboard: "Dashboard",
    loads: "Loads",
    drivers: "Drivers",
    users: "Users",
    // roles
    OWNER: "Owner",
    MANAGER: "Manager",
    DISPATCHER: "Dispatcher",
    UPDATER: "Updater",
    DRIVER: "Driver",
    // dashboard
    welcome: "Welcome",
    totalLoads: "Total loads",
    activeLoads: "Active loads",
    delivered: "Delivered",
    availableDrivers: "Available drivers",
    recentLoads: "Recent loads",
    myLoads: "My loads",
    // loads
    newLoad: "New load",
    editLoad: "Edit load",
    refNumber: "Ref #",
    broker: "Broker",
    origin: "Origin",
    destination: "Destination",
    pickupDate: "Pickup date",
    deliveryDate: "Delivery date",
    rate: "Rate",
    miles: "Miles",
    status: "Status",
    driver: "Driver",
    dispatcher: "Dispatcher",
    notes: "Notes",
    unassigned: "Unassigned",
    assignDriver: "Assign driver",
    addUpdate: "Add update",
    updates: "Updates history",
    location: "Location",
    // load statuses
    NEW: "New",
    ASSIGNED: "Assigned",
    IN_TRANSIT: "In transit",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    // drivers
    newDriver: "New driver",
    editDriver: "Edit driver",
    name: "Name",
    phone: "Phone",
    truckNumber: "Truck #",
    trailerNumber: "Trailer #",
    licenseNumber: "License #",
    driverStatus: "Availability",
    AVAILABLE: "Available",
    ON_LOAD: "On load",
    OFF_DUTY: "Off duty",
    // users
    newUser: "New user",
    editUser: "Edit user",
    role: "Role",
    linkedDriver: "Linked driver profile",
    none: "None",
    // common
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    actions: "Actions",
    confirmDelete: "Are you sure you want to delete this?",
    loading: "Loading...",
    noData: "No records yet",
    search: "Search",
    all: "All",
    close: "Close",
    view: "View",
    saved: "Saved",
    optional: "optional",
    leaveBlank: "leave blank to keep current",
  },
  ru: {
    appName: "Uzlider TMS",
    tagline: "Система управления грузоперевозками",
    signIn: "Войти",
    signOut: "Выйти",
    email: "Эл. почта",
    password: "Пароль",
    loginTitle: "Вход в аккаунт",
    loginError: "Неверная почта или пароль",
    demoAccounts: "Демо-аккаунты",
    dashboard: "Панель",
    loads: "Грузы",
    drivers: "Водители",
    users: "Пользователи",
    OWNER: "Владелец",
    MANAGER: "Менеджер",
    DISPATCHER: "Диспетчер",
    UPDATER: "Апдейтер",
    DRIVER: "Водитель",
    welcome: "Добро пожаловать",
    totalLoads: "Всего грузов",
    activeLoads: "Активные грузы",
    delivered: "Доставлено",
    availableDrivers: "Свободные водители",
    recentLoads: "Последние грузы",
    myLoads: "Мои грузы",
    newLoad: "Новый груз",
    editLoad: "Редактировать груз",
    refNumber: "Номер",
    broker: "Брокер",
    origin: "Откуда",
    destination: "Куда",
    pickupDate: "Дата загрузки",
    deliveryDate: "Дата выгрузки",
    rate: "Ставка",
    miles: "Мили",
    status: "Статус",
    driver: "Водитель",
    dispatcher: "Диспетчер",
    notes: "Заметки",
    unassigned: "Не назначен",
    assignDriver: "Назначить водителя",
    addUpdate: "Добавить обновление",
    updates: "История обновлений",
    location: "Локация",
    NEW: "Новый",
    ASSIGNED: "Назначен",
    IN_TRANSIT: "В пути",
    DELIVERED: "Доставлен",
    CANCELLED: "Отменён",
    newDriver: "Новый водитель",
    editDriver: "Редактировать водителя",
    name: "Имя",
    phone: "Телефон",
    truckNumber: "Номер тягача",
    trailerNumber: "Номер прицепа",
    licenseNumber: "Номер прав",
    driverStatus: "Доступность",
    AVAILABLE: "Свободен",
    ON_LOAD: "В рейсе",
    OFF_DUTY: "Не в сети",
    newUser: "Новый пользователь",
    editUser: "Редактировать пользователя",
    role: "Роль",
    linkedDriver: "Связанный профиль водителя",
    none: "Нет",
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
    edit: "Изменить",
    create: "Создать",
    actions: "Действия",
    confirmDelete: "Вы уверены, что хотите удалить?",
    loading: "Загрузка...",
    noData: "Пока нет записей",
    search: "Поиск",
    all: "Все",
    close: "Закрыть",
    view: "Просмотр",
    saved: "Сохранено",
    optional: "необязательно",
    leaveBlank: "оставьте пустым, чтобы не менять",
  },
  uz: {
    appName: "Uzlider TMS",
    tagline: "Yuk tashish boshqaruv tizimi",
    signIn: "Kirish",
    signOut: "Chiqish",
    email: "Email",
    password: "Parol",
    loginTitle: "Hisobingizga kiring",
    loginError: "Email yoki parol noto'g'ri",
    demoAccounts: "Demo hisoblar",
    dashboard: "Boshqaruv paneli",
    loads: "Yuklar",
    drivers: "Haydovchilar",
    users: "Foydalanuvchilar",
    OWNER: "Rahbar",
    MANAGER: "Menejer",
    DISPATCHER: "Dispetcher",
    UPDATER: "Yangilovchi",
    DRIVER: "Haydovchi",
    welcome: "Xush kelibsiz",
    totalLoads: "Jami yuklar",
    activeLoads: "Faol yuklar",
    delivered: "Yetkazilgan",
    availableDrivers: "Bo'sh haydovchilar",
    recentLoads: "So'nggi yuklar",
    myLoads: "Mening yuklarim",
    newLoad: "Yangi yuk",
    editLoad: "Yukni tahrirlash",
    refNumber: "Raqam",
    broker: "Broker",
    origin: "Qayerdan",
    destination: "Qayerga",
    pickupDate: "Yuklash sanasi",
    deliveryDate: "Yetkazish sanasi",
    rate: "Narx",
    miles: "Masofa (mil)",
    status: "Holat",
    driver: "Haydovchi",
    dispatcher: "Dispetcher",
    notes: "Izohlar",
    unassigned: "Biriktirilmagan",
    assignDriver: "Haydovchi biriktirish",
    addUpdate: "Yangilanish qo'shish",
    updates: "Yangilanishlar tarixi",
    location: "Joylashuv",
    NEW: "Yangi",
    ASSIGNED: "Biriktirilgan",
    IN_TRANSIT: "Yo'lda",
    DELIVERED: "Yetkazilgan",
    CANCELLED: "Bekor qilingan",
    newDriver: "Yangi haydovchi",
    editDriver: "Haydovchini tahrirlash",
    name: "Ism",
    phone: "Telefon",
    truckNumber: "Truck raqami",
    trailerNumber: "Tirkama raqami",
    licenseNumber: "Guvohnoma raqami",
    driverStatus: "Bandlik",
    AVAILABLE: "Bo'sh",
    ON_LOAD: "Yo'lda",
    OFF_DUTY: "Ishda emas",
    newUser: "Yangi foydalanuvchi",
    editUser: "Foydalanuvchini tahrirlash",
    role: "Rol",
    linkedDriver: "Bog'langan haydovchi profili",
    none: "Yo'q",
    save: "Saqlash",
    cancel: "Bekor qilish",
    delete: "O'chirish",
    edit: "Tahrirlash",
    create: "Yaratish",
    actions: "Amallar",
    confirmDelete: "Rostdan o'chirmoqchimisiz?",
    loading: "Yuklanmoqda...",
    noData: "Hozircha yozuvlar yo'q",
    search: "Qidirish",
    all: "Hammasi",
    close: "Yopish",
    view: "Ko'rish",
    saved: "Saqlandi",
    optional: "ixtiyoriy",
    leaveBlank: "o'zgartirmaslik uchun bo'sh qoldiring",
  },
};

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("uzlider_lang") as Lang | null;
      if (saved && ["en", "ru", "uz"].includes(saved)) setLangState(saved);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("uzlider_lang", l);
    } catch {}
  };

  const t = (key: string) => translations[lang][key] ?? key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export const LANG_LABELS: Record<Lang, string> = {
  en: "EN",
  ru: "RU",
  uz: "UZ",
};
