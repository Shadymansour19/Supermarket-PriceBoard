import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

export const RTL_LANGUAGES = new Set(["ar"]);

const resources = {
  en: {
    translation: {
      app: { name: "Bakala" },
      nav: { home: "Home", allCategories: "All categories" },
      search: { placeholder: "Search products…", noResults: "No products match your search." },
      product: {
        price: "Price",
        inStock: "In stock",
        outOfStock: "Out of stock",
        category: "Category",
        notFound: "Product not found.",
        backToCatalog: "Back to catalog",
      },
      common: {
        language: "Language",
        loading: "Loading…",
        error: "Something went wrong. Please try again.",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        add: "Add",
        confirmDelete: "Are you sure you want to delete this?",
        yes: "Yes",
        no: "No",
      },
      admin: {
        login: "Admin sign in",
        email: "Email",
        password: "Password",
        signIn: "Sign in",
        signOut: "Sign out",
        signInFailed: "Sign in failed. Check your email and password.",
        products: "Products",
        categories: "Categories",
        newProduct: "New product",
        newCategory: "New category",
        editProduct: "Edit product",
        editCategory: "Edit category",
        nameEn: "Name (English)",
        nameAr: "Name (Arabic)",
        descriptionEn: "Description (English)",
        descriptionAr: "Description (Arabic)",
        price: "Price",
        image: "Image",
        inStock: "In stock",
        active: "Visible to customers",
        parentCategory: "Parent category",
        topLevel: "— Top level —",
        notAdmin: "This account doesn't have admin access.",
        uploading: "Uploading image…",
      },
    },
  },
  ar: {
    translation: {
      app: { name: "بقالة" },
      nav: { home: "الرئيسية", allCategories: "كل الأقسام" },
      search: { placeholder: "ابحث عن منتج…", noResults: "لا توجد منتجات مطابقة لبحثك." },
      product: {
        price: "السعر",
        inStock: "متوفر",
        outOfStock: "غير متوفر",
        category: "القسم",
        notFound: "المنتج غير موجود.",
        backToCatalog: "العودة إلى الكتالوج",
      },
      common: {
        language: "اللغة",
        loading: "جارٍ التحميل…",
        error: "حدث خطأ ما. حاول مرة أخرى.",
        save: "حفظ",
        cancel: "إلغاء",
        delete: "حذف",
        edit: "تعديل",
        add: "إضافة",
        confirmDelete: "هل أنت متأكد أنك تريد حذف هذا؟",
        yes: "نعم",
        no: "لا",
      },
      admin: {
        login: "تسجيل دخول المشرف",
        email: "البريد الإلكتروني",
        password: "كلمة المرور",
        signIn: "تسجيل الدخول",
        signOut: "تسجيل الخروج",
        signInFailed: "فشل تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.",
        products: "المنتجات",
        categories: "الأقسام",
        newProduct: "منتج جديد",
        newCategory: "قسم جديد",
        editProduct: "تعديل المنتج",
        editCategory: "تعديل القسم",
        nameEn: "الاسم (إنجليزي)",
        nameAr: "الاسم (عربي)",
        descriptionEn: "الوصف (إنجليزي)",
        descriptionAr: "الوصف (عربي)",
        price: "السعر",
        image: "الصورة",
        inStock: "متوفر في المخزون",
        active: "ظاهر للعملاء",
        parentCategory: "القسم الرئيسي",
        topLevel: "— قسم رئيسي —",
        notAdmin: "هذا الحساب لا يملك صلاحية الإدارة.",
        uploading: "جارٍ رفع الصورة…",
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "ar",
    supportedLngs: ["en", "ar"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "bakala_lang",
    },
  });

export default i18n;
