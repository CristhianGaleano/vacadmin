<template>
    <v-layout v-resize="onResize" justify-space-between row>
         <v-flex xs-12 sm5 md5 lg3 class="usuarios" v-if="mostrarLista">
            <v-card>
                <v-toolbar color="primary"  dark dense>
                    <v-toolbar-title>
                        Usuarios
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
         <v-flex xs12 sm4 md4 lg7 v-if="mostrarChat">
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
                                <v-text-field ref="txtMensaje" v-model="mensaje" @keyup.enter="enviarMensaje" :loading="enviandoMensaje" :disabled="enviandoMensaje"  hide-details label="Escribe un mensaje"></v-text-field>
                            </v-card-text>
                         </v-card>
                     </v-flex>
               </v-layout>
             </v-container>
         </v-flex>
         <!-- column for interes contacts -->

     
    </v-layout>
</template>


<script>

import { db } from '@/firebase'
import uuidv4 from 'uuid/v4'
import Push  from 'push.js';

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
            height: 0,
            audio:  new Audio('https://www.ucp.edu.co/portal/wp-content/uploads/2020/10/new-msj.mp3')
        }
    },
    computed: {
        // filtroUsuarios(){
        //     return this.usuarios.reverse()
        // }
        // ,
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
            // return timeStamp.toDate().toISOString().substring(0,16).replace('T', ' ')
            return timeStamp.toDate().toString().substring(0,24)
        },
        // consulta los mensages para mostrarlos en la gui al seleccionar el user
        consultarChat () {
            this.chat = []
            // Cada vez que consultemos n nuevo chat, detenemos el anterior
            // sino es nulo, detenemos en chat anterior
            if(this.detenerChat){
                this.detenerChat()
            }

            this.detenerChat = db.collection('contactosvaca')
              .doc(this.cid)
              .collection('chat')
              .orderBy('fechaEnvio')
              .onSnapshot(snapshot => {
                  snapshot.docChanges().forEach(change => {
                    //   console('Change: '+ change.type)
                      if(change.type == 'added'){//added, modified, remove
                      console.log('add mensage: detener - consultar chat')
                          let mensaje = change.doc.data()
                          this.chat.push(mensaje)
                            console.log(mensaje)
                            // console.log('Comprando:' + mensaje.uid +' : '+ this.usuario.uid)
                            // analizar
                             // sino tinene lapropiedad fechaLeido es por que no se ha leido
                              if (!mensaje.fechaLeido && mensaje.uid !== this.usuario.uid) {
                              console.log('marcando msj como leido:'+ this.usuario.uid );
                            //   se encarga de insertar(contactos) y eliminar mensage(usuarios), esta última tiene el escuchador(la collection) para sumar o restar
                              this.marcarMensajeLeido(mensaje)
                          }
                      }



                        // El DOM esta actualizado y con  el this esta vinculado a la instancia atual
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
            //   codigo de prueba
            //   this.chat = [] 
        },
        marcarMensajeLeido(mensaje) {
            // coloca leido en contactos y elimina el mensaje en usuarios: verifcado
            let batch = db.batch()

            batch.update(
                db.collection('contactosvaca')
                    .doc(this.cid)
                    .collection('chat')
                    // id aleatorio
                    .doc(mensaje.mid),
                    { fechaLeido: new Date() }
            )

            //  se elimina pero lo hace al recibir msj, y el escuchador resta unidad
            batch.delete(
                db.collection('usuariosvaca')
                    .doc(this.usuario.uid)
                    .collection('chat-sin-leer')
                    .doc(mensaje.mid)
                    
            )

            batch.commit()
        },
        
        // Lee los usuarios, estos seran mostrados en el panel left
        async consultarUsuarios () {
            try {
                // recuperar cada usuario y adicionarle las propiedades, no sin antes dejar la collecion a la escucha de eventos
                db.collection('usuariosvaca')
                .onSnapshot( snapshot => {
                    snapshot.docChanges().forEach( change => {

                        let usuario = change.doc.data()

                        if (usuario.uid !== this.usuario.uid && usuario.rol == 'user') {
                             console.log('adicionando properties cant text')
                            usuario.cantidadMensajes = 0
                            usuario.ultimoMensaje = ''
                            this.usuarios.unshift(usuario)
                        }
                    } )
                })
                
                // // Accede a la colección 'usuarios'
                // let docs = await db.collection('usuariosvaca')
                //                     .get()
                // // Como vamos a obtener todos los documentos entonces get()
                // // recorriendo cada documento
                // docs.forEach(doc => {
                //     let usuario = doc.data()
                //     // add user record to end
                    
                //     if(usuario.uid !== this.usuario.uid && usuario.rol == 'user'){
                //     // if(usuario.uid !== this.usuario.uid && usuario.rol != 'user'){
                //         // add two properties
                //         console.log('adicionando properties cant text')
                //         usuario.cantidadMensajes = 0
                //         usuario.ultimoMensaje = ''
                //         this.usuarios.push(usuario)
                //     }
                // })
                // para leer y mostrar contador
                this.consultarChatSinLeer()
            } catch (error) {
                this.enviarNotificacion('Ocurrió un error al consultar la lista de usuarios', 'error')
            }
        },

        // aqui lee los mensages sin leer y lo suma, pero con respecto al usuario de la sesion
        consultarChatSinLeer () {
            // user current
            db.collection('usuariosvaca')
                .doc(this.usuario.uid)
                .collection('chat-sin-leer')
                .orderBy('fechaEnvio')
                .onSnapshot( snapshot => {
                    snapshot.docChanges().forEach( change => {//added. modified o remove
                    // mensage recuperado
                        let mensaje = change.doc.data()
                    // todos los mensages estan combinados, se identifica y se suma una unidad
                        let usuario = this.usuarios.find(u => u.uid == mensaje.uid)

    // sino es nullo
                        if (usuario) {
                                
                         switch(change.type){

                             case 'added':
                                usuario.cantidadMensajes++
                                usuario.ultimoMensaje = mensaje.texto
                                try {
                                    this.audio.play();
                                    
                                } catch (error) {
                                    console.log(error)
                                }
                                 Push.create('Tienes un nuevo mensaje por leer', {
                                    body: 'Desde Ventanilla Académica',
                                    icon: 'https://www.ucp.edu.co/portal/wp-content/uploads/2020/10/logo-vigi-black.png',
                                    timeout: 32000
                                })
                             break

                             case 'removed':
                                 usuario.cantidadMensajes--
                                 usuario.ultimoMensaje = ''

                            if(usuario.cantidadMensajes < 0){
                                usuario.cantidadMensajes = 0    
                            }
                            break
                         }
                            
                        }
                    })
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
        async  seleccionarUsuario (usuario) {
            this.cid = this.generarChatId(this.usuario.uid, usuario.uid)

            try {
                // await para garantizar que la consulta termine antes de preguntar si el usuario existe
                // Accede a la colección 'contactos
                // obtiene el documento con el id en 'cid'
                let doc = await db.collection('contactosvaca')
                            .doc(this.cid)
                            .get()

                if(!doc.exists){
                // si no existe entonces crea el documento
                    // creacion el documento 
                    await db.collection('contactosvaca')
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
            this.cid = null
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
            // la lista del chat
            batch.set(
                db.collection('contactosvaca')
                        .doc(this.cid)
                        .collection('chat')
                        .doc(mid),
                        mensajeEnviado
            )

            // lista general
            batch.set(
                db.collection('usuariosvaca')
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
                this.$nextTick(() => {
                    this.$refs.txtMensaje.focus()
                })
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