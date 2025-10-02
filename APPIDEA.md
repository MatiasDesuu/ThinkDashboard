Quiero que me crees una app en GO + Html/CSS/JS que será un dashboard que contendrá links/bookmarks que pone el usuario en una página HTML sencilla y ligera.

La app debe ser selfhosted (o sea, tiene que funcionar en docker)

Diseño:
1) Una página principal en la cual aparecerán los bookmarks
2) Diseño minimalista, solo texto
3) La idea es que para cada bookmark, si el usuario así lo eligio, pueda presionar una tecla y abrirlo automaticamente
3.1) Por ejemplo, si el usuario tiene el bookmark github (github.com) y le asignó la tecla G, al presionar la tecla G en la página, abrirá automaticamente ese bookmark

Pantallas
1) Pantalla principal donde estarán los bookmarks
2) Pantalla de configuración que se entrará agregando /config al final de la URL

Pantalla de Config:
1) Se podrá seleccionar tema oscuro o claro
2) Se podrán configurar los bookmarks que queremos (nombre y URL y shortcut opcional)
3) Se podrá configurar si queremos que al presionar un link, se abra ese link en una pestaña nueva o no
4) Se debe poder configurar las categorias (dentro de cada categoria, se podrán poner los bookmarks)
5) Se debe poder configurar cuantas columnas tendrá cada fila

La app tiene que ser ligera, con pocas dependencias y selfhosted.

Tiene que ser completamente responsiva (debe servir en desktop y PC)

En dashboardexample.html podés ver como se podría hacer el diseño de la app, segui algo similar a eso que es liviano y amigable

Todo tiene que estar en ingles.

Crea archivos para cada funcion importante, cada CSS y cada JS, la app tiene que ser facilmente administrable a futuro.
