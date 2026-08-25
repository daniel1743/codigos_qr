# Verificación técnica

## Montaje de React

La revisión de `client/index.html` confirmó un único `div#root` y una única carga de `/src/main.tsx`. Después de reiniciar el servidor y recargar `/?from_webdev=1`, la landing se renderizó completa y de forma estable. La comprobación posterior de consola se utiliza para distinguir cualquier aviso histórico de nuevos errores.

## Acceso de demostración

La ruta `/documentos/demo` abre sin depender de OAuth y muestra la interfaz aislada de carga de archivos. La carga inicial de documentos se verificará una vez que la consulta de la bóveda responda y se complete una carga no sensible.

El selector de archivos originalmente se activaba desde un botón que no exponía el input de carga a la automatización. Se sustituyó por un selector nativo visible para permitir la prueba no sensible de almacenamiento.

La carga de `cripqer-demo-storage-test.txt` se completó correctamente. La interfaz confirmó que el archivo fue almacenado, la consulta se refrescó a un documento activo y la fila persistida mostró el tipo TXT, el tamaño y el control de apertura autorizado.

## Conservación de recursos de la landing

Los cinco recursos visuales de Cripqer continúan referenciados mediante sus rutas `/manus-storage/` y sus fuentes permanecen bajo `/home/ubuntu/webdev-static-assets/`. La revisión de `client/public/` encontró únicamente los archivos internos de Manus, y el examen de `client/` no encontró medios locales. La captura de la landing y la compilación de producción confirmaron que los recursos se conservan correctamente sin añadir activos físicos al directorio de publicación.
