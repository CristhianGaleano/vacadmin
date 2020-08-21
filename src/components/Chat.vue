<template>
    <v-layout v-resize="onResize">
         <v-flex xs12 sm4 lg4 class="usuarios" v-if="mostrarLista">
            <v-card>
                <v-toolbar color="primary"  dark dense>
                    <v-toolbar-title>
                        Asesores
                    </v-toolbar-title>
                </v-toolbar>
                <v-list two-line class="pa-0 ma-0 scroll-y overflow-y-auto" id="scroll-target" style="max-height: 640px">
                    <!-- EL template no se renderiza en la página -->
                    <template v-for="usuario in usuarios">
                        <!-- value(estado activo del elemento):  -->
                        <v-list-item :value="usuarioSeleccionado && usuarioSeleccionado.uid == usuario.uid" 
                                        @click="seleccionarUsuario(usuario)" :key="usuario.uid" active-class="usuario-seleccionado">

                            <v-list-item-avatar size="40">
                                <v-img :src="usuario.foto"></v-img>
                            </v-list-item-avatar>

                            <v-list-item-content>
                                <v-list-item-title v-html="usuario.nombre" class="monster-font"></v-list-item-title>
                                <v-list-item-subtitle v-html="usuario.ultimoMensaje"></v-list-item-subtitle>
                            </v-list-item-content>

                            <v-list-item-action v-if="usuario.cantidadMensajes > 0">
                                <v-badge color="primary" overlap>
                                    <span slot="badge">{{ usuario.cantidadMensajes }}</span>
                                </v-badge>
                            </v-list-item-action>
                        </v-list-item>
                    </template>
                </v-list>
            </v-card>
         </v-flex>
         <v-flex xs12 sm8 lg5 v-if="mostrarChat">
             <v-container fill-height class="pa-0 ma-0" >
               <v-layout align-end>
                     <v-flex>
                         <v-card color="#f7faff" :class="mostrarLista ? 'ml-3' : 'ml-0'">
                            <v-toolbar color="primary card dense dark">
                                <v-toolbar-title>
                                    <v-icon @click="regresar" class="mr-2">arrow_back</v-icon>
                                    <v-avatar color="white" size="32">
                                        <v-img :src="usuarioSeleccionado.foto" ></v-img>
                                    </v-avatar>
                                    <span class="ml-3" monster-font>{{ usuarioSeleccionado.nombre }}</span>
                                </v-toolbar-title>
                            </v-toolbar>
                            <v-container ref="chatContainer" class="pa-0 ma-0 scroll-y overflow-y-auto" id="scroll-target" style="max-height: 640px">
                               <v-card-text>

                                    <v-flex xs7 :offset-xs5="item.uid == usuario.uid" class="my-3" v-for="item in chat" :key="item.mid">
                                        <v-layout column>
                                            <div class="chat-fecha">{{ convertirFecha(item.fechaEnvio) }}</div>
                                            <v-card :color="item.uid != usuario.uid ? 'white' : '#c3d9ff'" elevation="1" class="chat-mensaje">
                                                <v-card-text>
                                                    <div>{{item.texto}}</div>
                                                </v-card-text>
                                            </v-card>
                                        </v-layout>
                                    </v-flex>
                               </v-card-text>
                            </v-container>
                            <v-card-text >
                                <v-text-field ref="txtMensaje" v-model="mensaje" @keyup.enter="enviarMensaje" :loading="enviandoMensaje" :disabled="enviandoMensaje" hide-details label="Escribe un mensaje"></v-text-field>
                            </v-card-text>
                         </v-card>
                     </v-flex>
               </v-layout>
             </v-container>
         </v-flex>
    </v-layout>
</template>

<script>
import { db } from '@/firebase'
import uuidv4 from 'uuid/v4'

export default {
    props: ['usuario'],

    data(){
        return{
            usuarios: [],
            usuarioSeleccionado: null,
            chat:[],
            mensaje: '',
            enviandoMensaje: false,
            cid: null, //Control de usuario
            detenerChat: null,
            height: 0
        }
    },
    computed: {
        //Nos permite declarar variables calculadas
        esMovil(){
           return this.$vuetify.breakpoint.width < 600
        },
        mostrarLista(){
            return  this.usuarios && (!this.esMovil || !this.usuarioSeleccionado)
        },
        mostrarChat(){
            return this.usuarios &&  this.usuarioSeleccionado
        }
    },
    created() {
      this.consultarUsuarios()  //cuando se carga la parte de JS pero no la de HTML
    },
    methods: {
        onRisize(){
            this.height = window.innerHeight - 280
        },
        convertirFecha(timeStamp){
            return timeStamp.toDate().toISOString().substring(0, 16).replace('T', ' ')
        },
        regresar(){
            this.usuarioSeleccionado = null
        },
        enviarNotificacion(mensaje, color){
            this.$emit('onNotificacion', {mensaje, color})
        },

        async seleccionarUsuario(usuario){
            //Antes de seleccionar debemos validar que el documento existe sino crearalo
            this.cid = this.generarChatId(this.usuario.uid, usuario.uid)

            try {
                let doc = await db.collection('contactos')
                            .doc(this.cid)
                            .get()

                if(!doc.exists){ //Validar que la relacion entre los usuarios ya exista, sino crearla.
                    await db.collection('contactos')
                            .doc(this.cid)
                            .set({cid: this.cid})
                }
            } catch (error) {
                this.enviarNotificacion('ocurrio un error recuperando la información', 'error')
            }

            this.usuarioSeleccionado = usuario
            this.consultarChat()
        },

        generarChatId(uid1, uid2){//Identificador del contacto
            return uid1 < uid2 ? `${uid1}-${uid2}` : `${uid2}-${uid1}`
        },

        consultarChat(){
            this.chat = []

            if(this.detenerChat){//Validar si debemos detener el chat, uq elo nuevo que hemos escrito en el chat no vaya donde otro usuario.
                this.detenerChat() //Ejecutar la funcion.
            }

            this.detenerChat=  db.collection('contactos')
                .doc(this.cid)
                .collection('chat')
                .orderBy('fechaEnvio')
                .onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change =>{ //added, modified, removed
                        if(change.type == 'added'){
                            let mensaje = change.doc.data()
                            this.chat.push(mensaje)

                            if(!mensaje.fechaLeido && mensaje.uid != this.usuario.uid){
                                this.marcarMensajeLeido(mensaje) //Validacion del ultimo mensaje leido.
                            }
                        } //Cuanod agregarmos el mensaje renderizamos y la siguiente instruccion no se logra ejcuta. 

                        this.$nextTick(() => {
                            if(this.$refs.chatContainer){
                            this.$refs.chatContainer.scrollTop = 1000000     //Todo el listado de los elmentos referenciados.
                            }
                        })
                    })
                },
                () =>{
                    this.enviarNotificacion('Ocurrió un error al recuperar los mensajes', 'error')
                })//Escucha los cambios en la collección
        },
        marcarMensajeLeido(mensaje){
            //Marcar el mensaje como leido y borrarlo de los no leidos

            let batch = db.batch()

            batch.update(
                db.collection('contactos')
                    .doc(this.cid)
                    .collection('chat')
                    .doc(mensaje.mid),
                    {fechaLeido: new Date() }
            )
            batch.delete(
                db.collection('usuarios')
                    .doc(this.usuario.uid)
                    .collection('chat-sin-leer')
                    .doc(mensaje.mid)
            )

            batch.commit()
            //Luego restar la cantidad de mensajes sin leer.

        },
       async  consultarUsuarios (){ //Leer todos los usuarios
            try {
                let docs = await db.collection('usuarios')  //Obtener todos los documetos
                                .get()

                docs.forEach(doc => {   //ciclo para alamacenara cada documento en un array.
                    let usuario = doc.data()

                    if(usuario.uid !== this.usuario.uid){
                        usuario.cantidadMensajes = 0 //Añadiendo propiedades
                        usuario.ultimoMensaje = ''  
                        this.usuarios.push(usuario)
                    }
                });

                this.consultarChatSinLeer()
            } catch (error) {
                this.enviarNotificacion('Ocurrió un error consultando el listado de contactos', 'error')
            }
        },

        consultarChatSinLeer(){
            db.collection('usuarios')
                .doc(this.usuario.uid)
                .collection('chat-sin-leer')
                .orderBy('fechaEnvio')
                .onSnapshot( snapshot => {
                 snapshot.docChanges().forEach(change =>{
                    let mensaje = change.doc.data()
                        //Neceitamos recuperar los chat
                    let usuario = this.usuarios.find(u => u.uid == mensaje.uid) //Expresion lambda donde recorre todo elm array y hace la comparación.
                    if(usuario){
                        switch(change.type){
                            case 'added':
                                usuario.cantidadMensajes ++
                                usuario.ultimoMensaje = mensaje.texto
                                break
                            case 'removed':
                                usuario.cantidadMensajes --
                                usuario.ultimoMensaje = ''
                                if(usuario.cantidadMensajes < 0){usuario.cantidadMensajes = 0}

                                break

                        }
                    }
                 })
                },
                () =>{
                    this.enviarNotificacion('Ocurrió un error recuperando los mensajes sin leer', 'error')
                })
        },
        async enviarMensaje(){
            //Validar que no se envie mensaje vacio o que no se este enviando mensaje.
            if(!this.mensaje || this.enviandoMensaje){ return }

            this.enviandoMensaje = true;
             let mid = uuidv4()

             let mensajeEnviado = { //Objeto para almacenar el documento a recuperar.
                mid,
                texto : this.mensaje,
                fechaEnvio: new Date(),
                uid: this.usuario.uid //Usuario que envia
            }

            let batch = db.batch() //Crea un objeto donde se alamacena varias instrucciones y luego se ejecuto todo(lote)
                          
            batch.set(
                await db.collection('contactos')
                .doc(this.cid)
                .collection('chat')
                .doc(mid), //Identificaador del documento
                mensajeEnviado
            )

            batch.set(
                await db.collection('usuarios')
                .doc(this.usuarioSeleccionado.uid)
                .collection('chat-sin-leer')
                .doc(mid),
                mensajeEnviado
            )
               /*await db.collection('contactos')
                        .doc(this.cid)
                        .collection('chat')
                        .doc(mid) //Identificaador del documento
                        .set(mensajeEnviado) //

                await db.collection('usuarios')
                        .doc(this.usuarioSeleccionado.uid)
                        .collection('chat-sin-leer')
                        .doc(mid)
                        .set(mensajeEnviado)    //Agregando el mensaje recien envia a la colleccion de mensajes sin leer.
               */
              

            try {//Una vez que tenemos el ID de documento creado
               //Para almacenar e mensaje
                await batch.commit() //Ejecutar las instrucciones Batch

                 this.mensaje = ''
            } catch (error) {
                this.enviarNotificacion('Ocurrio un error enviando el mensaje, Inténtelo nuevamnete!', 'error')
            }
            finally{
                this.enviandoMensaje = false
                this.$nextTick(() => { //Sirve para esperar qur se actualice la interfaz
                    this.$refs.txtMensaje.focus()
                })
            }
        }
    },
}
</script>

<style>

    .usuario-seleccionado {
        background-color: #bad2ff;
    }
    .usuarios{
        background-color: #dfdfdf;
    }
    .chat-mensaje{
        border-radius: 10px;        
    }
    .chat-fecha{
        font-size:  0.8rem;
        margin: 3px;
        color: #929292;
    }

</style>