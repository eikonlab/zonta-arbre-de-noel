import { ref, computed } from 'vue';

const currentLanguage = ref('fr');

const translations = {
  fr: {
    verifying: "Vérification en cours...",
    validatingToken: "Validation du token d'accès...",
    messageSent: "Message envoyé !",
    messagePublished: "Votre message a été publié avec succès sur le mur de témoignages.",
    thankYou: "Merci pour votre contribution.",
    tokenExpired: "Accès au formulaire expiré - Veuillez rescanner le QR Code",
    context: "Cet espace recueille vos messages de soutien, pour lutter contre les violences faites aux femmes. Merci de partager un mot, une pensée, une inspiration pour les personnes victimes de ces actes. Tout contenu jugé hors-sujet est automatiquement signalé et retiré. Informations complémentaires auprès de l’Association",
    associationName: "«Victime, pas seule !»",
    yourName: "Votre nom",
    yourMessage: "Votre message",
    sending: "Envoi…",
    send: "Envoyer",
    rescanQR: "Rescannez le code QR",
    alertTokenInvalid: "Token invalide ou expiré. Impossible d'envoyer le message.",
    alertLengthExceeded: "Le message ne peut pas dépasser {maxLength} caractères.",
    alertAlreadyPosted: "Vous avez déjà posté un message aujourd'hui. Veuillez réessayer demain.",
    alertError: "Erreur lors de l'envoi du message. Veuillez réessayer.",
    pageTitle: "Zonta - Ajouter un message",
    qrInstruction: "Scannez ce code pour envoyer un message sur le sapin porte-paroles",
    messagesSent: "messages envoyés",
    selectScreen: "Choisir l'écran",
    screen: "Écran"
  },
  de: {
    verifying: "🔍 Überprüfung läuft...",
    validatingToken: "Zugriffstoken wird validiert...",
    messageSent: "Nachricht gesendet!",
    messagePublished: "Ihre Nachricht wurde erfolgreich auf der Pinnwand veröffentlicht.",
    thankYou: "Danke für Ihren Beitrag.",
    tokenExpired: "Formularzugriff abgelaufen - Bitte QR-Code erneut scannen",
    context: "Dieser Bereich sammelt Ihre Unterstützungsbotschaften im Kampf gegen Gewalt an Frauen. Danke, dass Sie ein Wort, einen Gedanken oder eine Inspiration für die Opfer dieser Taten teilen. Inhalte, die als unpassend erachtet werden, werden automatisch gemeldet und entfernt. Weitere Informationen beim Verein",
    associationName: "«Victime, pas seule !»",
    yourName: "Ihr Name",
    yourMessage: "Ihre Nachricht",
    sending: "Senden…",
    send: "Senden",
    rescanQR: "QR-Code erneut scannen",
    alertTokenInvalid: "Ungültiges oder abgelaufenes Token. Nachricht kann nicht gesendet werden.",
    alertLengthExceeded: "Die Nachricht darf {maxLength} Zeichen nicht überschreiten.",
    alertAlreadyPosted: "Sie haben heute bereits eine Nachricht gepostet. Bitte versuchen Sie es morgen erneut.",
    alertError: "Fehler beim Senden der Nachricht. Bitte versuchen Sie es erneut.",
    pageTitle: "Zonta - Nachricht hinzufügen",
    qrInstruction: "Scannen Sie diesen Code, um eine Nachricht an den Sprecherbaum zu senden",
    messagesSent: "Nachrichten gesendet",
    selectScreen: "Bildschirm auswählen",
    screen: "Bildschirm"
  }
};

export function useLanguage() {
  const t = computed(() => translations[currentLanguage.value]);

  function setLanguage(lang) {
    if (translations[lang]) {
      currentLanguage.value = lang;
      document.documentElement.lang = lang;
    }
  }

  function initLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('de')) {
      setLanguage('de');
    } else {
      setLanguage('fr');
    }
  }

  return {
    currentLanguage,
    t,
    setLanguage,
    initLanguage
  };
}
