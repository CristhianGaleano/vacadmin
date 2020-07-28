import firebase from '@firebase/app'

// referencias a las librerias de Aut y BD
require('firebase/auth')
require('firebase/firestore')
require('firebase/storage')
// require('@google-cloud/storage')

var firebaseConfig = {
    apiKey: "AIzaSyD8iB3LmsMdkmY4PnIHrDY1lxvp55N9xHk",
    authDomain: "chat-ucp.firebaseapp.com",
    databaseURL: "https://chat-ucp.firebaseio.com",
    projectId: "chat-ucp",
    storageBucket: "chat-ucp.appspot.com",
    messagingSenderId: "240210462109",
    appId: "1:240210462109:web:86c5069e720e6b3b459b74"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  // instancias pra aut y bd
  const auth = firebase.auth()
  const db = firebase.firestore()
  // const provider = new firebase.auth.GoogleAuthProvider()
  const storage = firebase.storage()

  // exportando para poderlas utilizar en los componentes
  export { auth, db, storage }
