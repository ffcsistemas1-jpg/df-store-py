# Prompt de trabajo — Corrección definitiva del carrito móvil

## Objetivo
Corregir exclusivamente la presentación del carrito de compra de DF Store PY en teléfonos móviles. El carrito debe verse ordenado, profesional, claro y fácil de usar, sin imágenes gigantes, recortes extraños, superposición de textos ni desbordamiento horizontal.

## Problema observado
En `/carrito`, la imagen del producto ocupa un área excesiva y termina dominando la tarjeta. El nombre, precio, selector de cantidad, stock y botón `Eliminar` quedan superpuestos, desplazados o visualmente desordenados. El problema afecta al carrito público, no al panel administrativo.

## Requisitos de implementación

1. Revisar `app/carrito/page.tsx` y cualquier CSS global que pueda afectar las imágenes del carrito.
2. Crear una tarjeta de producto con estructura independiente:
   - Miniatura del producto.
   - Información del producto.
   - Precio unitario.
   - Selector de cantidad.
   - Stock disponible.
   - Total de la línea.
   - Botón `Eliminar`.
3. En móvil:
   - Usar una cuadrícula de dos columnas para miniatura e información.
   - Miniatura fija de aproximadamente 92 × 92 px.
   - Aplicar `object-fit: contain`.
   - Aplicar `max-width: 100%`, `max-height: 100%` y `overflow: hidden` para impedir que la imagen invada otros elementos.
   - Colocar el total y `Eliminar` en una fila separada debajo, ocupando todo el ancho.
   - Evitar cualquier desbordamiento horizontal.
   - Mantener textos legibles y controles táctiles.
4. En escritorio:
   - Mantener una tarjeta horizontal con miniatura, información y acciones alineadas.
   - No modificar el funcionamiento del carrito.
5. No cambiar la lógica de Supabase, stock, cantidades, subtotal, eliminación ni checkout salvo que sea estrictamente necesario.
6. No modificar la web pública fuera del carrito ni el panel administrativo.
7. Verificar que funcionen:
   - Aumentar/disminuir cantidad.
   - Actualizar cantidad manualmente.
   - Mostrar stock.
   - Eliminar producto.
   - Calcular subtotal.
   - Continuar al checkout.
   - Carrito vacío.
8. Ejecutar build/lint si están disponibles.
9. Publicar el cambio en la rama `main` y confirmar que Vercel genere un nuevo deployment de producción.
10. Probar en viewport móvil de 360 px, 390 px y 412 px, además de escritorio.

## Criterio de aceptación visual
La imagen nunca debe cubrir el nombre, precio, cantidad, stock, total o botón `Eliminar`. Cada elemento debe estar dentro de su propia zona, con espacios consistentes, bordes suaves y una jerarquía visual profesional.
