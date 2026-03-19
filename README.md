# Proyecto Final de Desarrollo en la Nube: SwitchFile


## Problema

En el manejo cotidiano de archivos digitales, es común la necesidad de convertir documentos, imágenes o archivos multimedia a distintos formatos. Aunque existen herramientas locales para este propósito, estas presentan limitaciones importantes, como la dependencia del sistema operativo, la falta de escalabilidad para procesar grandes volúmenes de archivos de forma simultánea y la ausencia de funcionalidades de gestión, como el acceso al historial de conversiones desde múltiples dispositivos. 
 
En este contexto, SwitchFile se propone como una solución basada en la nube que, mediante infraestructura de AWS, permite la carga y conversión de archivos desde cualquier dispositivo sin necesidad de instalación. Su arquitectura distribuida y el uso de procesamiento asíncrono mediante colas de mensajes facilitan la ejecución eficiente de tareas en lote, así como la gestión concurrente de múltiples solicitudes, ofreciendo una alternativa más robusta, escalable y flexible frente a las soluciones locales. 

---

### Descripción de la aplicación

Los usuarios de SwitchFile interactúan con la aplicación principalmente a través de archivos. Las entradas soportadas abarcan dos categorías: documentos y archivos multimedia (imágenes, audio y video). El procesamiento en lote de un ZIP puede contener múltiples archivos de las categorías anteriores.
En cuanto al uso esperado en la práctica, se espera que un usuario acceda a la aplicación desde un navegador web, inicie sesión con su cuenta, suba uno o varios archivos, seleccione el formato de destino y espere el resultado. Posteriormente, el usuario puede descargar los archivos generados y consultar su historial de conversiones.


---
