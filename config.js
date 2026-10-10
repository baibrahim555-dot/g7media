// Fichier PUBLIC (visible par tous) : jamais de clé secrète ici.
window.G7 = {
  url: "https://cbmpkjwucxpdqgpuckmq.supabase.co",
  key: "sb_publishable_iwXU1ei4WwAkavO4DQotgQ_dP-eiJw4",
  site: "https://VOTRE-COMPTE.github.io/g7media", // adresse publique du site
  brand: "G7 Media", wa: "221761820406",
  buckets: { photos: "photos", galleries: "galleries", uploads: "uploads" },
  images: { max: 2400, thumb: 640, quality: 0.92, format: "image/jpeg", maxMB: 25 }, // compression avant envoi
  locale: { default: "fr", all: ["fr", "en"] },
  currency: "FCFA",
  features: { shop: false, wave: false, chat: false, privateGalleries: false, blog: false }, // activés lot par lot
  wave: { mode: "manuel", number: "" }, // "manuel" (preuve de paiement) puis "api"
  consentVersion: "2026-10-08"
};