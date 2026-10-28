import { useLocation } from "react-router-dom";


const pages: Record<
  string,
  {
    title: string
    intro: string
    sections: Array<[string, string]>
  }
> = {
  privacidad: {
    title: "Política de privacidad y tratamiento de datos personales",
    intro:
      "En Sublime Gracia respetamos la privacidad de nuestros clientes y protegemos sus datos personales de acuerdo con la Ley 1581 de 2012, sus normas reglamentarias y las demás disposiciones colombianas aplicables. Responsable del tratamiento: Juan Andres Castro Prasca, persona natural. Esta política explica qué información recopilamos, para qué la utilizamos y cómo puedes ejercer tus derechos.",
    sections: [
      [
        "1. Responsable y contacto",
        "El responsable del tratamiento es Juan Andres Castro Prasca, con domicilio en San Pedro Sucre y veredas aledañas. Puedes presentar consultas, solicitudes o reclamaciones mediante correo electrónico gsublime378@gmail.com, whatsApp al número: (+57) 301-708-9860  o en el punto físico ubicado en San Pedro Sucre calle 19 #06-43 barrio San Martin."
      ],
      [
        "2. Datos personales que recopilamos",
        "Para gestionar los pedidos podemos solicitar nombre, correo electrónico, teléfono, dirección, ciudad de entrega y comprobante de pago. Si publicas una opinión, podemos tratar el nombre que decidas mostrar, la calificación y el contenido de tu comentario. El formulario de contacto recopila nombre, correo electrónico y mensaje. También podemos tratar la información necesaria para atender solicitudes, verificar transacciones y cumplir obligaciones legales."
      ],
      [
        "3. Finalidades del tratamiento",
        "Utilizamos los datos para recibir y gestionar pedidos, verificar los pagos, coordinar las entregas, informar sobre el estado de una compra, responder consultas, atender reclamaciones y publicar las opiniones que envíen los usuarios. No utilizamos los datos para enviar publicidad comercial, según la práctica informada por Sublime Gracia. Cualquier nueva finalidad que requiera autorización será informada previamente cuando corresponda."
      ],
      [
        "4. Autorización y derechos del titular",
        "Cuando la ley lo requiera, solicitaremos autorización previa, expresa e informada para tratar los datos personales. Puedes conocer, actualizar y rectificar tus datos; solicitar prueba de la autorización; preguntar por su uso; presentar quejas ante la Superintendencia de Industria y Comercio después de agotar el trámite correspondiente ante el responsable; y solicitar la revocatoria de la autorización o la supresión de los datos cuando proceda legalmente. Estos derechos no eliminan los datos que deban conservarse por una obligación legal o contractual."
      ],
      [
        "5. Cómo presentar consultas y reclamaciones",
        "Puedes ejercer tus derechos mediante correo electronico gsublime378@gmail.com o whatsApp al número: (+57) 301-708-9860, o en el punto físico indicado en esta política. Indica tu nombre, la solicitud concreta y la información necesaria para verificar tu identidad. Las consultas y reclamaciones se atenderán dentro de los términos legales aplicables. Las consultas tienen, como regla general, un plazo de (5-7) días hábiles, y los reclamos de (7-10) días hábiles, sujetos a las reglas y extensiones previstas en la normativa."
      ],
      [
        "6. Proveedores y almacenamiento",
        "La tienda utiliza servicios tecnológicos para operar. El sitio web está publicado en Netlify, el backend funciona en Render, la base de datos está alojada en Neon y el formulario de contacto utiliza EmailJS. Google Analytics utiliza el identificador de medición G-G68JZC6VYJ y, según la configuración informada, solo se activa después de que el visitante acepta las analíticas. Estos proveedores pueden procesar información técnica o personal necesaria para prestar sus servicios. Antes de publicar, el responsable debe verificar las condiciones de cada proveedor, sus ubicaciones de procesamiento y las transferencias internacionales que puedan producirse."
      ],
      [
        "7. Conservación de la información",
        "Conservaremos los datos durante el tiempo necesario para cumplir las finalidades informadas, gestionar pedidos y reclamaciones, atender garantías y cumplir obligaciones legales, contables o probatorias. Los plazos concretos dependerán de cada categoría de información y de las obligaciones aplicables. Cuando los datos ya no sean necesarios y no exista un deber legal de conservarlos, se eliminarán o anonimizarán de forma segura."
      ],
      [
        "8. Seguridad y confidencialidad",
        "Adoptamos medidas técnicas, administrativas y organizativas razonables para proteger la información contra pérdida, acceso no autorizado, alteración o divulgación. El acceso a los datos debe limitarse a quienes lo necesiten para gestionar las operaciones de la tienda. Ningún sistema puede garantizar seguridad absoluta, pero atenderemos los incidentes de acuerdo con las obligaciones legales aplicables."
      ],
      [
        "9. Opiniones y publicación de información",
        "Si envías una opinión sobre un producto, el nombre para mostrar, la calificación y el comentario podrán publicarse en el sitio. Evita incluir información privada, datos financieros o datos personales de terceros en el texto. Si solicitas corregir o retirar una opinión asociada a tus datos, revisaremos la petición, respetando las obligaciones legales y los derechos de terceros."
      ],
      [
        "10. Menores de edad",
        "La tienda no pretende recopilar innecesariamente datos personales de niños, niñas o adolescentes. Si se llegaran a tratar datos de menores, deberán observarse las reglas especiales de protección, el interés superior del menor y los requisitos de autorización que resulten aplicables."
      ],
      [
        "11. Cambios en esta política",
        "Podemos actualizar esta política cuando cambien las prácticas de tratamiento, los servicios tecnológicos o las obligaciones legales. Publicaremos la versión vigente en el sitio web, indicando la fecha de actualización cuando se implemente ese dato."
      ]
    ]
  },

  terminos: {
    title: "Términos y condiciones de compra",
    intro:
      "Estos términos regulan las compras realizadas en Sublime Gracia, tienda de perfumería que opera desde Colombia. Al utilizar el sitio puedes consultar productos, conocer sus precios, gestionar el carrito y enviar pedidos. Las condiciones se aplican sin limitar los derechos irrenunciables que reconoce la legislación colombiana de protección al consumidor.",
    sections: [
      [
        "1. Identidad del vendedor",
        "El vendedor es [NOMBRE LEGAL COMPLETO DEL VENDEDOR], persona natural, con domicilio en [MUNICIPIO Y DEPARTAMENTO]. Canales de atención: [CORREO ELECTRÓNICO], [WHATSAPP COMERCIAL] y punto físico en [DIRECCIÓN]. Esta información debe completarse y mantenerse actualizada para que el comprador pueda identificar al proveedor y presentar reclamaciones."
      ],
      [
        "2. Productos, descripciones y disponibilidad",
        "Las características, presentaciones, tamaños, fotografías y precios de los perfumes se muestran en las fichas de producto. Las fotografías son ilustrativas cuando así se indique; las características esenciales del producto deben corresponder a lo ofrecido. La disponibilidad está sujeta a inventario. Si un producto no está disponible después de recibir un pedido, informaremos al cliente oportunamente y se aplicarán las opciones y devoluciones previstas por la ley."
      ],
      [
        "3. Precios y promociones",
        "El precio aplicable será el informado al cliente antes de finalizar la compra. Las promociones estarán sujetas a sus condiciones publicadas, vigencia, disponibilidad y reglas de acumulación, cuando corresponda. Antes de confirmar el pedido, el cliente podrá revisar los productos, cantidades, descuentos, costo del envío cuando aplique y total por pagar. No se solicitarán cargos adicionales que no hayan sido informados y aceptados."
      ],
      [
        "4. Pedidos y confirmación",
        "El envío de una solicitud de compra no significa por sí solo que el pago haya sido verificado ni que el pedido esté confirmado para despacho. Sublime Gracia revisará la información necesaria, la disponibilidad y, cuando corresponda, el comprobante de pago. La confirmación y las instrucciones de entrega se comunicarán mediante los canales disponibles. El cliente debe suministrar información correcta para procesar su pedido."
      ],
      [
        "5. Medios de pago",
        "Los medios de pago informados actualmente son Nequi y efectivo, según la modalidad de compra acordada. Las instrucciones de pago se comunicarán por los canales oficiales de Sublime Gracia. El cliente debe verificar el destinatario y el valor antes de transferir dinero y conservar el comprobante. No debe enviar pagos adicionales sin conocer el concepto, el importe y el total actualizado de la compra."
      ],
      [
        "6. Cobertura y costos de envío",
        "El envío es gratuito en San Pedro, Sucre, y en las veredas y corregimientos cercanos que Sublime Gracia tenga habilitados para esta condición. La cobertura gratuita debe confirmarse antes de aceptar el pedido. Para otros destinos, el costo del transporte no está incluido en el subtotal de los productos y se informa por separado antes de confirmar la compra. Cuando se haya acordado que el transporte se paga contraentrega, el cliente pagará ese costo directamente al transportador al recibir el envío, de acuerdo con la modalidad confirmada. No debe entenderse que el producto también se paga contraentrega, salvo que esa modalidad haya sido acordada expresamente."
      ],
      [
        "7. Plazos y entrega",
        "El plazo estimado informado por Sublime Gracia es de uno (1) a cinco (5) días, sujeto a la confirmación del pedido, la cobertura del destino y las condiciones logísticas. Antes de publicar, debe precisarse si se trata de días hábiles o calendario y si el plazo corresponde a preparación, transporte o entrega total. El plazo concreto aplicable se comunicará al comprador antes de finalizar la compra. Si no es posible cumplirlo o el producto no está disponible, se informará al cliente y se respetarán las opciones de terminación y devolución del dinero que correspondan conforme a la ley."
      ],
      [
        "8. Cancelaciones antes del despacho",
        "Si deseas cancelar un pedido que todavía no ha sido despachado, comunícate cuanto antes por los canales oficiales. Revisaremos el estado de la compra y te informaremos el procedimiento aplicable. Esta gestión comercial no limita el derecho de retracto, la garantía legal, la reversión del pago ni otros derechos que procedan conforme a la normativa."
      ],
      [
        "9. Derecho de retracto",
        "En las ventas a distancia, el derecho de retracto se rige por el artículo 47 de la Ley 1480 de 2011 y sus modificaciones. Como regla general, cuando procede, debe ejercerse dentro de los cinco (5) días hábiles siguientes a la entrega del bien. El consumidor debe devolver el producto en las condiciones legales exigibles y asume los costos de transporte y devolución previstos en la ley. Para las compras por comercio electrónico, la devolución del dinero debe realizarse dentro del plazo legal aplicable, que puede ser de hasta quince (15) días calendario desde el ejercicio del derecho cuando se hayan cumplido los requisitos legales. Existen excepciones legales, entre ellas la correspondiente a bienes de uso personal. La aplicación de una excepción a un perfume concreto dependerá de la naturaleza del producto y de las circunstancias; no se interpretará esta cláusula como una exclusión automática de todos los productos ni de otros derechos del consumidor."
      ],
      [
        "10. Garantía legal y productos defectuosos",
        "Los productos cuentan con los derechos de garantía legal que correspondan según la ley, su naturaleza y las condiciones de comercialización. Si recibes un producto defectuoso, distinto al solicitado o con un problema de calidad, comunícate con Sublime Gracia e indica el número de pedido, describe la situación y adjunta fotografías u otra evidencia disponible. La solicitud será evaluada conforme a la garantía legal y a las obligaciones del productor o proveedor. No se excluyen por estos términos los derechos que legalmente correspondan al consumidor."
      ],
      [
        "11. Reversión del pago",
        "En las compras realizadas por comercio electrónico con instrumentos de pago electrónicos, el consumidor puede solicitar la reversión del pago en los supuestos legales, como fraude, operación no solicitada, producto no recibido, producto distinto al solicitado o producto defectuoso. Deben cumplirse los requisitos y términos legales, incluidos, cuando procedan, la reclamación al proveedor, la devolución del producto y la notificación al emisor del instrumento de pago. El procedimiento depende del medio utilizado y de los participantes en el pago. Esta figura no se presenta como una devolución automática para compras pagadas en efectivo."
      ],
      [
        "12. Cambios y devoluciones comerciales",
        "Las solicitudes de cambio voluntario por motivos distintos a una garantía o a un derecho legal serán revisadas según las condiciones que Sublime Gracia informe expresamente al comprador. No se ha establecido en este documento un plazo comercial adicional ni una exclusión específica por apertura del empaque. Cualquier condición comercial deberá comunicarse antes de la compra y no podrá desconocer la garantía legal, el retracto cuando proceda ni los demás derechos reconocidos por la ley."
      ],
      [
        "13. Atención de solicitudes y reclamaciones",
        "Para consultas, solicitudes de cambio, reclamaciones de garantía o asuntos relacionados con un pedido, utiliza [CORREO ELECTRÓNICO], [WHATSAPP COMERCIAL] o visita el punto físico ubicado en [DIRECCIÓN]. Incluye los datos del pedido y una descripción clara de la solicitud. Sublime Gracia atenderá las reclamaciones conforme a los plazos y procedimientos legales aplicables."
      ],
      [
        "14. Protección al consumidor",
        "Estos términos se interpretan de acuerdo con la legislación colombiana, incluyendo la Ley 1480 de 2011 y sus modificaciones. Ninguna disposición pretende limitar derechos irrenunciables del consumidor. Puedes consultar información y canales oficiales de la Superintendencia de Industria y Comercio en https://www.sic.gov.co/."
      ],
      [
        "15. Actualizaciones",
        "Los términos pueden actualizarse cuando cambien los productos, las condiciones operativas o las normas aplicables. Las condiciones vigentes para una compra serán las informadas al consumidor al momento de realizarla, sin perjuicio de las disposiciones legales obligatorias."
      ]
    ]
  },

  cookies: {
    title: "Política de cookies y analíticas",
    intro:
      "Sublime Gracia utiliza almacenamiento técnico necesario para el funcionamiento de la tienda y ofrece analíticas opcionales. Según la configuración informada, Google Analytics, con identificador de medición G-G68JZC6VYJ, solo se carga después de que el visitante acepta las analíticas en el aviso de consentimiento.",
    sections: [
      [
        "1. Qué son las cookies y tecnologías similares",
        "Las cookies son pequeños archivos que un sitio web puede guardar en el navegador. También pueden utilizarse tecnologías similares, como almacenamiento local del navegador, para recordar preferencias o permitir funciones del sitio. La tecnología utilizada depende de la configuración real de la tienda."
      ],
      [
        "2. Almacenamiento necesario",
        "El sitio puede utilizar almacenamiento técnico necesario para recordar preferencias de funcionamiento y permitir procesos como la navegación o el carrito de compras. Estas tecnologías no deben utilizarse para finalidades publicitarias no informadas. Las preferencias de cookies pueden guardarse en el navegador para recordar la elección del visitante."
      ],
      [
        "3. Analíticas opcionales",
        "Google Analytics se utiliza para obtener estadísticas sobre el uso del sitio, como las páginas visitadas y la interacción con sus funciones. El identificador de medición configurado es G-G68JZC6VYJ. De acuerdo con la configuración declarada, las analíticas solo se activan después de la aceptación del visitante. Si se rechazan, el sitio debe mantener desactivada esta función opcional."
      ],
      [
        "4. Proveedores y procesamiento de información",
        "Google Analytics es un servicio de Google. La información técnica puede ser procesada por Google conforme a la configuración del servicio y sus condiciones de privacidad. Antes de publicar, Sublime Gracia debe revisar la configuración real de cookies, los datos recopilados, las opciones de conservación, la ubicación del procesamiento y las posibles transferencias internacionales. No se afirma un periodo de conservación específico mientras no se haya verificado en la cuenta."
      ],
      [
        "5. Cómo cambiar tu preferencia",
        "Puedes cambiar tu elección utilizando el enlace «Preferencias de cookies» disponible en el pie de página, si está habilitado. Al rechazar las analíticas, Google Analytics no debe cargarse. Si el panel de preferencias no funciona o no aparece, contacta a Sublime Gracia por los canales de atención publicados."
      ],
      [
        "6. Configuración del navegador",
        "Puedes administrar o eliminar cookies desde la configuración de tu navegador. Sin embargo, bloquear almacenamiento técnico necesario puede afectar algunas funciones de la tienda. La eliminación de datos del navegador también puede borrar la preferencia de consentimiento y hacer que el sitio vuelva a solicitar tu elección."
      ],
      [
        "7. Cambios en esta política",
        "Esta política puede actualizarse si se incorporan nuevos proveedores, tecnologías o finalidades. La descripción publicada debe mantenerse alineada con las tecnologías realmente utilizadas por el sitio."
      ]
    ]
  },

  devoluciones: {
    title: "Cambios, devoluciones y garantías",
    intro:
      "En Sublime Gracia queremos que recibas el producto que solicitaste y que conozcas las opciones disponibles si surge un inconveniente. Esta política se aplica junto con la Ley 1480 de 2011, la Ley 2439 de 2024 y las demás normas colombianas que correspondan. Ninguna condición comercial elimina los derechos legales del consumidor.",
    sections: [
      [
        "1. Producto equivocado, defectuoso o pedido incompleto",
        "Si recibes un producto distinto al solicitado, detectas daños atribuibles a la entrega o consideras que existe un defecto de calidad, comunícate con nosotros tan pronto como sea posible mediante [CORREO ELECTRÓNICO] o [WHATSAPP COMERCIAL]. Indica el número de pedido, explica el inconveniente y adjunta fotografías del producto, del empaque y de la guía de envío cuando estén disponibles. La solicitud se evaluará de acuerdo con la garantía legal y las obligaciones aplicables."
      ],
      [
        "2. Garantía legal",
        "La garantía legal se aplica en los términos previstos por la legislación colombiana. La solución dependerá de la naturaleza del inconveniente, las características del producto y las reglas legales aplicables. Cuando proceda, se atenderán las medidas de reparación, reposición o devolución del dinero previstas por la ley. La garantía no puede rechazarse de manera automática por el simple hecho de que el cliente haya abierto el empaque si la reclamación está relacionada con un defecto cubierto legalmente."
      ],
      [
        "3. Derecho de retracto en compras a distancia",
        "El retracto puede proceder en compras realizadas por internet u otros medios de venta a distancia, dentro de los cinco (5) días hábiles siguientes a la entrega del bien, siempre que se cumplan los requisitos legales. Cuando aplica, el consumidor debe devolver el producto en las condiciones exigidas por la ley y asumir los costos de transporte de devolución previstos legalmente. La devolución del dinero en comercio electrónico debe realizarse dentro del plazo legal aplicable, que puede ser de hasta quince (15) días calendario una vez se haya ejercido el derecho y cumplido los requisitos exigidos."
      ],
      [
        "4. Particularidades de los perfumes",
        "La legislación contempla excepciones al derecho de retracto para determinadas categorías de bienes, incluidos los bienes de uso personal. La aplicación de esta excepción a un perfume dependerá de la naturaleza del producto y de las circunstancias concretas. Por ello, no afirmamos que todos los perfumes estén excluidos del retracto ni que abrir un empaque elimine automáticamente los derechos de garantía legal. Cada solicitud será revisada conforme a la normativa."
      ],
      [
        "5. Cambios voluntarios por preferencia del cliente",
        "Los cambios por razones como preferencia de aroma, elección equivocada por parte del comprador o cambio de opinión, cuando no exista un defecto ni otro derecho legal aplicable, dependen de las condiciones comerciales que Sublime Gracia haya informado y aceptado previamente. No se establece en esta política un plazo comercial adicional ni una promesa de cambio automático. Cualquier condición voluntaria debe comunicarse claramente antes de la compra."
      ],
      [
        "6. Costos de transporte",
        "Cuando la ley atribuya al consumidor los costos de transporte asociados al retracto, estos serán asumidos por el consumidor en los términos legales. En otros casos, incluidos los que correspondan a una garantía legal, el responsable de los costos se determinará conforme a las obligaciones legales aplicables y a las circunstancias del caso. No se cobrarán costos no informados ni cargos que contradigan los derechos del consumidor."
      ],
      [
        "7. Reversión del pago",
        "Si la compra se pagó mediante un instrumento electrónico, el consumidor podrá solicitar la reversión cuando se presente uno de los supuestos legales, como fraude, operación no solicitada, no recepción del producto, entrega de un producto distinto o producto defectuoso. Debe presentar la reclamación dentro del término legal, notificar al emisor del instrumento de pago y cumplir los demás requisitos aplicables. El trámite depende del medio de pago y de los participantes en la transacción."
      ],
      [
        "8. Devolución del dinero",
        "Cuando corresponda una devolución, se realizará dentro del plazo legal aplicable y por el medio de pago o mecanismo permitido por la normativa. La Ley 2439 de 2024 establece reglas especiales para las devoluciones en comercio electrónico, incluido el plazo aplicable al retracto y las opciones de devolución que deben informarse al consumidor. La tienda no aplicará descuentos o retenciones que estén prohibidos por la ley."
      ],
      [
        "9. Cómo presentar una solicitud",
        "Contacta a Sublime Gracia mediante [CORREO ELECTRÓNICO], [WHATSAPP COMERCIAL] o en el punto físico ubicado en [DIRECCIÓN]. Incluye nombre, número de pedido, fecha de recepción, descripción del caso y evidencia disponible. No envíes productos de regreso sin solicitar primero instrucciones sobre el procedimiento de devolución, salvo que debas actuar por un término legal y las circunstancias requieran otra actuación."
      ],
      [
        "10. Tiempo de respuesta",
        "Atenderemos las solicitudes conforme a los términos legales que correspondan a cada tipo de petición o reclamación. La recepción de una solicitud no implica su aceptación automática, pero será evaluada de buena fe y sin desconocer los derechos del consumidor."
      ]
    ]
  }
}


const Politicas = () => {
    const { pathname } = useLocation();
    const key = pathname.replace("/", "");
    const page = pages[key] || pages.privacidad;
    return (
        <main className="site-page legal-page">
            <h1>{page.title}</h1>
            <p>{page.intro}</p>
            {page.sections.map(([heading, content]) => (
                <section key={heading}>
                    <h2>{heading}</h2>
                    <p>{content}</p>
                </section>
            ))}

            <br />
            <br />

            <p >
                <a className="draft-notice" href="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981" target="_blank" rel="noopener noreferrer">Ley 1581 de 2012</a>
                <a className="draft-notice" href="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306" target="_blank" rel="noopener noreferrer">Ley 1480 de 2011</a>
                <a className="draft-notice" href="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=257116" target="_blank" rel="noopener noreferrer">Ley 2439 de 2024</a>

            </p>
        </main>
    );
};

export default Politicas;
