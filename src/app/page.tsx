"use client"; // Requis pour les animations côté client avec Framer Motion

import { Button } from "@/components/ui/button";
import { CheckCircle, X, Star, Mail, Store, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { UpsellWidget } from "@/components/UpsellWidget";

export default function Home() {
  // États pour gérer l'affichage des modales
  const [showTrialForm, setShowTrialForm] = useState(false);
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    boutique: "",
    urlShopify: "",
    consent: false
  });

  // Fonction pour gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          boutique: formData.boutique,
          urlShopify: formData.urlShopify,
          consent: formData.consent,
          source: "LANDING",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Lead submit failed", err);
        setSubmitError(err?.error ?? "Une erreur est survenue. Réessaie.");
        return;
      }

      const data = await res.json();
      console.log("Lead saved:", data);
      // Tracking minimal (no-op si GA/Tag non présent)
      if (typeof window !== "undefined") {
        // @ts-expect-error gtag global optionnel
        window.gtag?.("event", "lead_submitted", { email: formData.email, source: "LANDING" });
        // @ts-expect-error dataLayer global optionnel
        window.dataLayer?.push({ event: "lead_submitted", email: formData.email, source: "LANDING" });
      }

      setShowConfirmation(true);
      setShowTrialForm(false);
      setShowDemoForm(false);
    } catch (err) {
      console.error("Lead submit error", err);
      setSubmitError("Impossible d'envoyer pour le moment. Réessaie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Variants pour l'animation d'apparition en fondu
  const FADE_IN_ANIMATION_VARIANTS = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <main className="flex flex-col items-center text-foreground">
      {/* Fond avec notre dégradé personnalisé via Tailwind CSS */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-gradient-to-br from-blue-100 via-blue-50 to-white"></div>
      
      <div className="container mx-auto px-4">

        {/* La section est maintenant un composant `motion` pour orchestrer l'animation */}
        <motion.section 
          className="text-center py-20 sm:py-24 lg:py-32"
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.2 }} // Décale l'animation de chaque enfant
        >
          <div className="max-w-4xl mx-auto">
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-snug"
              variants={FADE_IN_ANIMATION_VARIANTS}
            >
              Remplacez 3 commerciaux à 150k€/an par 1 agent IA à 1.2k€/an qui vend 30% mieux
            </motion.h1>
            
            <motion.p 
              className="mt-6 text-lg md:text-xl text-muted-foreground"
              variants={FADE_IN_ANIMATION_VARIANTS}
            >
              Des agents IA qui analysent chaque panier en temps réel, 
              suggèrent les produits complémentaires parfaits et 
              augmentent votre panier moyen de 30% dès le premier jour.
            </motion.p>
            
            <motion.div 
              className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4"
              variants={FADE_IN_ANIMATION_VARIANTS}
            >
              <Button 
                size="lg" 
                onClick={() => setShowTrialForm(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-sm sm:text-base px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 border-0 w-full sm:w-auto sm:max-w-[280px] h-auto min-h-[44px] sm:min-h-[48px]"
              >
                <div className="flex flex-col items-center justify-center leading-tight">
                  <span className="hidden sm:inline">🚀 </span>
                  <span className="sm:hidden">🎯 </span>
                  <span className="whitespace-nowrap">ÊTRE PRÉVENU DU LANCEMENT</span>
                  <span className="text-xs sm:text-sm font-semibold opacity-90">(GRATUIT)</span>
                </div>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => setShowDemoForm(true)}
                className="border-2 border-gray-300 hover:border-gray-400 font-semibold px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-sm h-auto min-h-[44px] sm:min-h-[48px] w-full sm:w-auto sm:max-w-[240px]"
              >
                <span className="hidden sm:inline">📺 </span>
                <span className="sm:hidden">▶️ </span>
                Voir une démo 2min
              </Button>
            </motion.div>

            <motion.p 
              className="mt-4 text-sm text-muted-foreground"
              variants={FADE_IN_ANIMATION_VARIANTS}
            >
              Offre de lancement : 30 jours gratuits (durée limitée)
            </motion.p>

            <motion.div 
              className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left"
              variants={FADE_IN_ANIMATION_VARIANTS}
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-primary" />
                <span className="font-medium">Setup en 5 minutes sur Shopify (sans code)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-primary" />
                <span className="font-medium">+30% panier moyen garanti ou remboursé</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-primary" />
                <span className="font-medium">Travaille 24h/24, 7j/7</span>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Section Tarifs */}
        <motion.section 
          className="py-20 bg-white rounded-3xl my-8 shadow-lg"
          initial="initial"
          animate="animate"
          transition={{ delay: 0.5 }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2 
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
              variants={FADE_IN_ANIMATION_VARIANTS}
            >
              Embaucher un commercial IA pour 99€/mois
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-600 mb-12"
              variants={FADE_IN_ANIMATION_VARIANTS}
            >
              Offre de lancement : 99€/mois au lieu de 120€/mois
            </motion.p>
            
            {/* Prix principal */}
            <motion.div 
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-2xl max-w-md mx-auto shadow-2xl"
              variants={FADE_IN_ANIMATION_VARIANTS}
            >
              <div className="text-6xl font-bold mb-2">99€</div>
              <div className="text-xl mb-4">par mois</div>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 border-0 w-full sm:w-auto"
                onClick={() => setShowTrialForm(true)}
              >
                🎯 ACCÈS PRIORITAIRE GRATUIT
              </Button>
            </motion.div>

            {/* Avantages inclus */}
            <motion.div 
              className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6 text-center mx-auto sm:max-w-md"
              variants={FADE_IN_ANIMATION_VARIANTS}
            >
              <div className="flex flex-col items-center gap-1">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700 text-center">30 jours d'essai gratuit</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700 text-center">Setup en 5 minutes</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700 text-center">Support prioritaire</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700 text-center">Garantie 30 jours</span>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Social Proof */}
        <motion.div 
          className="text-center py-8"
          initial="initial"
          animate="animate"
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <span className="font-medium">🚀 Innovation en cours de développement</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Rejoignez les premiers à découvrir cette technologie révolutionnaire
          </p>
        </motion.div>

        {/* Section FAQ */}
        <motion.section 
          className="py-20 bg-gray-50 rounded-3xl my-8"
          initial="initial"
          animate="animate"
          transition={{ delay: 0.8 }}
        >
          <div className="max-w-4xl mx-auto">
            <motion.h2 
              className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12"
              variants={FADE_IN_ANIMATION_VARIANTS}
            >
              Questions fréquentes
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div 
                className="bg-white p-6 rounded-xl shadow-sm"
                variants={FADE_IN_ANIMATION_VARIANTS}
              >
                <h3 className="font-semibold text-lg text-gray-900 mb-3">
                  Compatible avec tous les thèmes Shopify ?
                </h3>
                <p className="text-gray-600">
                  Oui ! Notre agent IA s'intègre parfaitement avec tous les thèmes Shopify, 
                  même les plus personnalisés.
                </p>
              </motion.div>

              <motion.div 
                className="bg-white p-6 rounded-xl shadow-sm"
                variants={FADE_IN_ANIMATION_VARIANTS}
              >
                <h3 className="font-semibold text-lg text-gray-900 mb-3">
                  Fonctionne avec des produits digitaux ?
                </h3>
                <p className="text-gray-600">
                  Absolument ! L'IA analyse le comportement d'achat, pas le type de produit. 
                  Idéal pour tous les e-commerces.
                </p>
              </motion.div>

              <motion.div 
                className="bg-white p-6 rounded-xl shadow-sm"
                variants={FADE_IN_ANIMATION_VARIANTS}
              >
                <h3 className="font-semibold text-lg text-gray-900 mb-3">
                  Support en français ?
                </h3>
                <p className="text-gray-600">
                  Oui, 7j/7 ! Notre équipe française est disponible pour t'accompagner 
                  dans la configuration et l'optimisation.
                </p>
              </motion.div>

              <motion.div 
                className="bg-white p-6 rounded-xl shadow-sm"
                variants={FADE_IN_ANIMATION_VARIANTS}
              >
                <h3 className="font-semibold text-lg text-gray-900 mb-3">
                  Combien de temps pour voir les résultats ?
                </h3>
                <p className="text-gray-600">
                  Dès le premier jour ! L'IA commence à analyser et suggérer immédiatement. 
                  Les premiers résultats arrivent dans les 24h.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Upsell Widget Test Section */}
        <UpsellWidget />

        {/* Modale Formulaire Essai Gratuit */}
        {showTrialForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div 
              className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Accès prioritaire gratuit</h3>
                <button 
                  onClick={() => setShowTrialForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email professionnel *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ton-email@boutique.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la boutique *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.boutique}
                    onChange={(e) => setFormData({...formData, boutique: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ma Boutique"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de ta boutique Shopify *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.urlShopify}
                    onChange={(e) => setFormData({...formData, urlShopify: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://maboutique.myshopify.com"
                  />
                </div>
                
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consent}
                    onChange={(e) => setFormData({...formData, consent: e.target.checked})}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-600">
                    J'accepte de recevoir des conseils IA par email pour optimiser mes ventes
                  </label>
                </div>
                
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? "Envoi..." : "Confirmer mon accès prioritaire"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modale Formulaire Démo */}
        {showDemoForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div 
              className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Voir une démo 2min</h3>
                <button 
                  onClick={() => setShowDemoForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email professionnel *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ton-email@boutique.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la boutique *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.boutique}
                    onChange={(e) => setFormData({...formData, boutique: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ma Boutique"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de ta boutique Shopify *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.urlShopify}
                    onChange={(e) => setFormData({...formData, urlShopify: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://maboutique.myshopify.com"
                  />
                </div>
                
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consent}
                    onChange={(e) => setFormData({...formData, consent: e.target.checked})}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-600">
                    J'accepte de recevoir la démo et des conseils IA par email
                  </label>
                </div>
                
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? "Envoi..." : "Recevoir ma démo 2min"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Page de Confirmation après Signup */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div 
              className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  🎉 Félicitations ! Vous êtes dans les 100 premiers !
                </h2>
              </div>
              
              <div className="space-y-4 text-left max-w-lg mx-auto">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                  <span className="text-gray-700">Votre accès prioritaire est confirmé</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                  <span className="text-gray-700">Lancement prévu : <strong>15 janvier 2025</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                  <span className="text-gray-700">Vous recevrez votre accès par email dès que c'est prêt</span>
                </div>
              </div>

              <div className="mt-8 p-6 bg-blue-50 rounded-xl">
                <h3 className="font-semibold text-lg text-blue-900 mb-3">
                  🚀 En attendant le lancement :
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>💬 Une question ? Répondez à cet email</p>
                  <p>📊 Aidez-nous : quel est votre principal défi en vente online ?</p>
                  <p>⭐ Les premiers inscrits auront un accès privilégié au lancement !</p>
                </div>
              </div>

              <Button 
                onClick={() => {
                  setShowConfirmation(false);
                  setFormData({ email: "", boutique: "", urlShopify: "", consent: false });
                }}
                className="mt-6"
                size="lg"
              >
                Parfait, je ferme cette fenêtre
              </Button>
            </motion.div>
          </div>
        )}

      </div>
    </main>
  );
}
