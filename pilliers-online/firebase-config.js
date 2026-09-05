/*
  Configuration Firebase — À REMPLIR avant de publier le site.

  Comment obtenir ces valeurs :
  1. Va sur https://console.firebase.google.com et crée un projet gratuit.
  2. Dans "Créer une base de données" -> Realtime Database -> crée-en une
     (choisis une région proche, ex: europe-west1).
  3. Dans Paramètres du projet (roue crantée) -> Général -> "Tes applications"
     -> icône "</>" (Web) -> donne un nom -> Firebase te donne un objet
     firebaseConfig : copie-le ici, en remplaçant l'objet ci-dessous.
  4. Dans Realtime Database -> onglet "Règles", colle les règles fournies
     dans le message de livraison (autorise la lecture/écriture sous /games).

  Ces valeurs (apiKey compris) sont publiques par nature côté Firebase Web :
  ce n'est pas un secret, la sécurité réelle se fait via les règles de la
  base de données (étape 4).
*/
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCXm0oXp0EeeP9xGndaP97dvJ2BBcwKDTY",
  authDomain: "terminus-pilliers.firebaseapp.com",
  databaseURL: "https://terminus-pilliers-default-rtdb.firebaseio.com",
  projectId: "terminus-pilliers",
  storageBucket: "terminus-pilliers.firebasestorage.app",
  messagingSenderId: "96714637730",
  appId: "1:96714637730:web:a439b29fccfbfb707ef2fb",
};
