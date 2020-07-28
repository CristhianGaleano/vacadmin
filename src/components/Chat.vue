<template>
    <v-layout v-resize="onResize">
         <v-flex xs12 sm4 lg4 class="usuarios" v-if="mostrarLista">
            <v-card>
                <v-toolbar color="primary"  dark dense>
                    <v-toolbar-title>
                        Contactos
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
                               <v-card-text :style="'max-height: ' + height + 'px;'" v-scroll:#scroll-target="onScroll">
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
    data () {
        return {
            usuarios: [],
            usuarioSeleccionado: null,
            chat: [],
            mensaje: '',
            enviandoMensaje: false,
            cid: null,
            detenerChat: null,
            height: 0
        }
    },
    computed: {
        esMovil() {
           return this.$vuetify.breakpoint.width < 600
        },
        mostrarLista() {
            return this.usuarios && (!this.esMovil || !this.usuarioSeleccionado)
        },
        mostrarChat() {
            return this.usuarios && this.usuarioSeleccionado
        }
    },
    created() {
        this.consultarUsuarios()
    },
    methods: {
        convertirFecha (timeStamp) {
            return timeStamp.toDate().toISOString().substring(0,16).replace('T', ' ')
        },
        consultarChat () {
            console.log('consultando chat');
            this.chat = []
            // Cada vez que consultemos n nuevo chat, detenemos el anterior
            if(this.detenerChat){
                this.detenerChat()
            }

            this.detenerChat = db
              .collection('contactos')
              .doc(this.cid)
              .collection('chat')
              .orderBy('fechaEnvio')
              .onSnapshot(snapshot => {
                  snapshot.docChanges().forEach(change => {
                      if(change.type == 'added'){//added, modified, remove
                          let mensaje = change.doc.data()
                          this.chat.push(mensaje)

                            // sino tinene lapropiedad fechaLeido es por que no se ha leido
                          if (!mensaje.fechaLeido && mensaje.uid != this.usuario.uid) {
                              this.marcarMensajeLeido(mensaje)
                          }
                      }

                      this.$nextTick(() => {
                          if(this.$refs.chatContainer){
                              this.$refs.chatContainer.scrollTop = 100000
                          }
                      })
                  })
              }, 
              () => {
                  this.enviarNotificacion('Ocurrió un error recuperando los mensajes', 'error')
              })
        },
        marcarMensajeLeido(mensaje) {
            let batch = db.batch()


            batch.update(
                // La colletion 'contactos' almacena el mensaje del propio emisor
                db.collection('contactos')
                    .doc(this.cid)
                    .collection('chat')
                    .doc(mensaje.mid),
                    // add
                    { fechaLeido: new Date() }
                    
            )
            console.log('Mensaje leido');
            // para eliminar el anterior
            batch.delete(
                db.collection('usuarios')
                // user currents
                    .doc(this.usuario.uid)
                    .collection('chat-sin-leer')
                    .doc(mensaje.mid)
                    
            )

            batch.commit()
        },
        async consultarUsuarios () {
            
                // Accede a la colección 'usuarios'
                 await db.collection('usuarios')
                                    .orderBy('lastSignInTime')                
                                    .onSnapshot( snapshot => {
                                        snapshot.docChanges().forEach(change => {

                                            let usuario = change.doc.data()
                                            switch (change.type) {
                                                case 'added':
                                                        
                                                        if(usuario.uid !== this.usuario.uid && usuario.rol == 'user'){
                                                            // add two properties
                                                            usuario.cantidadMensajes = 0
                                                            usuario.ultimoMensaje = ''
                                                            this.usuarios.push(usuario)
                                                        }
                                                        this.consultarChatSinLeer()
                                                    break;
                                            
                                                
                                            }
                                        } )
                                    }, 
              () => {
                  this.enviarNotificacion('Ocurrió un error al consultar la lista de usuarios', 'error')
              }) 
              

           
        },
        //  async consultarUsuarios () {
        //     try {
        //         // Accede a la colección 'usuarios'
        //         let docs = await db.collection('usuarios')
        //                             .orderBy('lastSignInTime')                
        //         // Como vamos a obtener todos los documentos entonces get()
        //                             .get()
        //         // recorriendo cada documento
        //         docs.forEach(doc => {
        //             let usuario = doc.data()
        //             // add user record to end
                    
        //             if(usuario.uid !== this.usuario.uid && usuario.rol == 'user'){
        //                 // add two properties
        //                 usuario.cantidadMensajes = 0
        //                 usuario.ultimoMensaje = ''
        //                 this.usuarios.push(usuario)
        //             }
        //         });
        //         this.consultarChatSinLeer()
        //     } catch (error) {
        //         this.enviarNotificacion('Ocurrió un error al consultar la lista de usuarios', 'error')
        //     }
        // },
        consultarChatSinLeer () {
            db.collection('usuarios')
            // user current
                .doc(this.usuario.uid)
                .collection('chat-sin-leer')
                .orderBy('fechaEnvio')
                .onSnapshot( snapshot => {
                    snapshot.docChanges().forEach(change => {//added. modified o remove
                        let mensaje = change.doc.data()

                        let usuario = this.usuarios.find(u => u.uid == mensaje.uid)

                        if (usuario) {
                            
                            switch (change.type) {
                                case 'added':
                                    console.log('A adde chat sin leer, change is: ', change.type);
                                        usuario.cantidadMensajes++
                                        usuario.ultimoMensaje = mensaje.texto
                                    break;
                            
                                case 'removed':
                                    console.log('R adde chat sin leer, change is: ', change.type);
                                    usuario.cantidadMensajes--
                                    usuario.ultimoMensaje = ''

                                    if(usuario.cantidadMensajes < 0){
                                        usuario.cantidadMensajes = 0
                                    }
                                    break;

                            
                            }
                        }
                    });
                }, () => {
                    this.enviarNotificacion('Ocurrió un error recuperando mensajes sin leer','error')
                } )
        },
        enviarNotificacion (mensaje, color) {
            // se envia al padre(este debe estar escuchando): nombre del evento y el objeto
            this.$emit('onNotificacion', { mensaje, color })
        },
        generarChatId (uid1, uid2) {
            return uid1 < uid2 ? `${uid1}-${uid2}` : `${uid2}-${uid1}`
        },
        // genera la llave entre uid de user selected y sesion
        async  seleccionarUsuario (usuario) {
            this.cid = this.generarChatId(this.usuario.uid, usuario.uid)

            try {
                // await para garantizar que la consulta termine antes de preguntar si el usuario existe
                // Accede a la colección 'contactos
                let doc = await db.collection('contactos')
                // obtiene el documento con el id en 'cid'
                            .doc(this.cid)
                            .get()

                if(!doc.exists){
                // si no existe entonces crea el documento
                    // creacion deñ documento 
                    await db.collection('contactos')
                    
                            .doc(this.cid)
                            .set({cid: this.cid})
                }

                this.usuarioSeleccionado = usuario

                this.consultarChat() 
            } catch (error) {
                this.enviarNotificacion('Ocurrió un error recuperando la información','error')
            }
        },
        regresar () {
            this.usuarioSeleccionado = null
        },
        async enviarMensaje () {
            if(!this.mensaje  || this.enviandoMensaje) { return }

            this.enviandoMensaje = true

            let mid = uuidv4()

            // Objeto que nos define el documento que almacenaremos
            let mensajeEnviado = {
                mid,
                texto: this.mensaje,
                fechaEnvio: new Date(),
                uid: this.usuario.uid
            }
            
            // Procesamiento por lotes(o todo se guarda o nada)
            let batch = db.batch()
            batch.set(
                db.collection('contactos')
                        .doc(this.cid)
                        .collection('chat')
                        .doc(mid),
                        mensajeEnviado
            )

            batch.set(
                db.collection('usuarios')
                        .doc(this.usuarioSeleccionado.uid)
                        .collection('chat-sin-leer')
                        .doc(mid),
                        mensajeEnviado
            )

            try {
                
                await batch.commit()

                
                this.mensaje = ''
            } catch (error) {
                this.enviarNotificacion('Ocurrió un error enviando el mensaje. Intentalo de nuevo', 'error')
            }
            finally {
                this.enviandoMensaje = false
                this.$refs.txtMensaje.focus()
            }
        },
        onResize () {
            this.height = window.innerHeight - 150
        }
    },
}
</script>

<style>
    .usuarios {
        background-color: #ddffdd;
    }

    .usuario-seleccionado {
        background-color:  rgba(83, 11, 11, 0.767);
    }

    .chat-mensaje {
        border-radius: 10px;
    }

    .chat-fecha {
        font-size: 0.8rem;
        margin: 3px;
        color: #929292;
    }
</style>