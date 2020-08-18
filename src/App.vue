<template>
  <v-app>
    <v-app-bar app color="primary" dark>

      <div class="d-flex align-center">
        <v-toolbar-title class="headline monster-font">
          Ventanilla Académica
        </v-toolbar-title>
      </div>
        <v-chip class="ml-3" color="secondary">
          <v-avatar left>
        <v-icon>forum</v-icon>
      </v-avatar>Contacto en línea</v-chip>

      <v-spacer></v-spacer>
      <v-layout v-if="usuario" align-center justify-end>
        <v-avatar size="40" color="white">
          <v-img :src="usuario.foto"></v-img>
        </v-avatar>
        <span class="ml-1
         monster-font">{{ usuario.nombre }}</span>
        <v-btn class="monster-font ml-4" small  @click="callLogout" >Salir</v-btn>
        <!-- <v-btn class="monster-font ml-4" small  @click="usuario = null">Salir</v-btn> -->
      </v-layout>

    </v-app-bar>

    <v-content>
      <v-container fluid fill-height class="fondo">
        <!-- this tags reciben data del component hijo -->
        <Login v-show="!usuario" ref="childRef" @onNotificacion="mostrarNotificacion" @onIngresar="ingresar"/>
        <Chat v-if="usuario" @onNotificacion="mostrarNotificacion" :usuario="usuario" />
      </v-container>
    </v-content>

    <v-snackbar v-model="notificacion.visible" :color="notificacion.color" multi-line top :timeout="6000" dark>
      <span>{{ notificacion.mensaje }}</span>
      <v-btn color="white" text @click="notificacion.visible=false">
          Cerrar
      </v-btn>
    </v-snackbar>


    <v-footer color="primary" dark dense>
      <v-layout justify-center >
        <span>Universidad Católica de Pereira - Oficina de Comunicaciones - 2020</span>
      </v-layout>
    </v-footer>
  </v-app>
</template>

<script>
// import {auth} from '@/firebase'

import Login from './components/Login';
// import LoginWithGoogle from './components/LoginWithGoogle';
import Chat from './components/Chat';

export default {
  name: 'App',

  components: {
    // Login,
    Login,
    Chat
  },

  data () {
    return {
      usuario: null,
      notificacion: {
        mensaje: '',
        color: 'info',
        visible: false
      }
    }
  },
  created() {
    // console.log('create method');
    // auth.onAuthStateChanged(user=>{
    //   if(user){
    //     // console.log(user);
    //     this.usuario = user
    //     console.log('CD-User signed: ',user);
    //   }
    // })
  },
  methods: {
    ingresar (usuario) {
       this.usuario = usuario
       console.log('IN-User login: ',usuario);
    },
    mostrarNotificacion (notificacion) {
        this.notificacion.mensaje = notificacion.mensaje
        this.notificacion.color = notificacion.color
        this.notificacion.visible = true
    },
    callLogout (){
      this.$refs.childRef.executeLogout()
      this.usuario = null
    }
  },
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;1,500&display=swap');
.monster-font {
  font-family: 'Roboto', sans-serif !important;
}
.fondo {
  background-color: #f1f1f1;
}
</style>
