import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED, LegalPage, Ph, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Condiciones de uso de Señal: cuentas, publicación de espacios, reservas, comisión, calificaciones y conducta.",
};

const sections: LegalSection[] = [
  {
    id: "que-es-senal",
    title: "Qué es Señal",
    body: (
      <>
        <p>
          Señal es una plataforma operada por <Ph>RAZÓN SOCIAL</Ph>, RUT <Ph>RUT</Ph>, con domicilio en{" "}
          <Ph>DOMICILIO</Ph> (en adelante, &quot;Señal&quot;), que conecta a personas que ofrecen estudios de
          grabación, salas de ensayo, sets de rodaje, estudios fotográficos y locaciones por hora
          (&quot;anfitriones&quot;) con personas que quieren usarlos (&quot;clientes&quot;).
        </p>
        <p>
          Señal actúa como <strong>intermediario</strong>: no es dueña de los espacios, no los administra ni presta
          los servicios que se realizan en ellos. El contrato de uso del espacio se celebra directamente entre el
          anfitrión y el cliente.
        </p>
        <p>Al crear una cuenta o usar la plataforma aceptas estos términos y la Política de privacidad.</p>
      </>
    ),
  },
  {
    id: "cuentas",
    title: "Cuentas y roles",
    body: (
      <>
        <p>
          Para reservar o publicar necesitas una cuenta con un correo válido. Eres responsable de mantener tu
          contraseña en reserva y de toda actividad hecha desde tu cuenta. Debes ser mayor de 18 años.
        </p>
        <ul>
          <li>
            <strong>Cliente:</strong> busca espacios, envía reservas o solicitudes y califica los espacios que usó.
          </li>
          <li>
            <strong>Anfitrión:</strong> publica espacios, acepta o rechaza solicitudes, marca las sesiones como
            completadas y califica a sus clientes.
          </li>
        </ul>
        <p>Una misma persona puede actuar como cliente y como anfitrión. La información de tu perfil debe ser veraz.</p>
      </>
    ),
  },
  {
    id: "publicacion",
    title: "Publicación de espacios",
    body: (
      <>
        <p>
          El anfitrión declara que tiene derecho a ofrecer el espacio y que la ficha (fotos, descripción, equipamiento,
          horario, capacidad, precio y reglas) es fiel a la realidad. Las fotos deben ser del propio espacio.
        </p>
        <p>
          El precio se fija por hora y en pesos chilenos. El anfitrión define el mínimo de horas por reserva, su horario
          de funcionamiento y, si quiere, una nota mínima que deben tener los clientes para reservar directo.
        </p>
        <p>
          Señal puede pausar o retirar publicaciones que infrinjan estos términos o que reciban reclamos fundados.
        </p>
      </>
    ),
  },
  {
    id: "reservas",
    title: "Reservas y solicitudes",
    body: (
      <>
        <p>Las reservas son por horas completas dentro del horario del espacio.</p>
        <ul>
          <li>
            <strong>Reserva directa:</strong> si el anfitrión no exige nota mínima, o tu nota como cliente la cumple, la
            reserva queda confirmada al enviarla y el horario se bloquea.
          </li>
          <li>
            <strong>Solicitud:</strong> si no cumples la nota mínima (o aún no tienes calificaciones), tu reserva se envía
            como solicitud. El anfitrión puede aceptarla o rechazarla. Mientras tanto, el horario no se bloquea.
          </li>
        </ul>
        <p>
          Las reglas de cancelación y vencimiento están en la{" "}
          <Link href="/cancelaciones">Política de cancelación</Link>.
        </p>
      </>
    ),
  },
  {
    id: "comision",
    title: "Precio y comisión de la plataforma",
    body: (
      <>
        <p>
          El total de una reserva es el precio por hora del espacio multiplicado por las horas reservadas (el
          &quot;subtotal&quot;), más una <strong>tarifa de servicio de Señal equivalente al 10% del subtotal</strong>.
          El desglose se muestra antes de confirmar.
        </p>
        <p>
          Por ahora Señal no procesa pagos en línea. Las condiciones de cobro, pago al anfitrión y reembolsos se
          publicarán antes de activarlos.
        </p>
      </>
    ),
  },
  {
    id: "calificaciones",
    title: "Calificaciones a ciegas",
    body: (
      <>
        <p>
          Cuando el anfitrión marca una sesión como completada, el cliente puede calificar el espacio y el anfitrión al
          cliente. Las calificaciones son <strong>a ciegas</strong>: ninguna parte ve la nota de la otra hasta que ambas
          la envíen o pasen 14 días desde que se completó la sesión.
        </p>
        <p>
          Solo se puede calificar una sesión realmente completada, una vez por cada parte. Una calificación revelada no
          se puede editar ni borrar. Las calificaciones deben ser honestas y referirse a la experiencia; Señal puede
          ocultar las que incluyan insultos, datos personales o contenido prohibido.
        </p>
      </>
    ),
  },
  {
    id: "conducta",
    title: "Conducta y contenido prohibido",
    body: (
      <>
        <p>No está permitido:</p>
        <ul>
          <li>Publicar información falsa, engañosa o fotos que no sean del espacio.</li>
          <li>Acordar pagos o reservas fuera de la plataforma para evitar la tarifa de servicio.</li>
          <li>Usar los espacios para actividades ilícitas o que infrinjan las reglas del anfitrión.</li>
          <li>Acosar, discriminar o amenazar a otras personas, en la plataforma o en el espacio.</li>
          <li>Publicar contenido que infrinja derechos de terceros, sea sexualmente explícito o promueva la violencia.</li>
          <li>Crear cuentas falsas, manipular calificaciones o intentar vulnerar la seguridad del sitio.</li>
        </ul>
      </>
    ),
  },
  {
    id: "responsabilidad",
    title: "Responsabilidad del anfitrión y del cliente",
    body: (
      <>
        <p>
          El anfitrión es responsable de su espacio: de que esté disponible en el horario reservado, de que cumpla las
          condiciones de seguridad y la normativa aplicable (permisos, instalaciones eléctricas, aforo) y de que el
          equipamiento publicado funcione.
        </p>
        <p>
          El cliente es responsable de usar el espacio y el equipamiento con cuidado, respetar el horario y las reglas
          del anfitrión, y responder por los daños que cause.
        </p>
        <p>
          Señal no es parte del contrato entre anfitrión y cliente y no responde por el estado de los espacios ni por lo
          que ocurra durante una sesión, sin perjuicio de los derechos que la ley otorga a los consumidores.
        </p>
      </>
    ),
  },
  {
    id: "suspension",
    title: "Suspensión y cierre de cuentas",
    body: (
      <>
        <p>
          Señal puede suspender o cerrar cuentas que incumplan estos términos, previa revisión y, cuando sea posible,
          aviso a la persona afectada. Puedes cerrar tu cuenta escribiendo a <Ph>CORREO DE CONTACTO</Ph>; las reservas y
          calificaciones ya realizadas se conservan según la Política de privacidad.
        </p>
      </>
    ),
  },
  {
    id: "cambios",
    title: "Cambios a estos términos",
    body: (
      <p>
        Podemos actualizar estos términos. Si el cambio es relevante, lo avisaremos en el sitio o por correo antes de
        que entre en vigor. Seguir usando Señal después de esa fecha implica aceptar la nueva versión.
      </p>
    ),
  },
  {
    id: "ley-aplicable",
    title: "Ley aplicable y contacto",
    body: (
      <>
        <p>
          Estos términos se rigen por las leyes de la República de Chile, incluida la Ley 19.496 sobre protección de los
          derechos de los consumidores cuando corresponda. Las controversias se someterán a los tribunales ordinarios de{" "}
          <Ph>CIUDAD</Ph>, sin perjuicio de la competencia que la ley otorgue a los juzgados de policía local.
        </p>
        <p>
          Para dudas o reclamos escribe a <Ph>CORREO DE CONTACTO</Ph>.
        </p>
      </>
    ),
  },
];

export default function TerminosPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Términos y condiciones"
      updated={LEGAL_UPDATED}
      intro={
        <p className="dim">
          Las reglas para usar Señal como cliente o como anfitrión. Léelas junto a la{" "}
          <Link className="acc" href="/privacidad">
            Política de privacidad
          </Link>{" "}
          y la{" "}
          <Link className="acc" href="/cancelaciones">
            Política de cancelación
          </Link>
          .
        </p>
      }
      sections={sections}
      pending={["RAZÓN SOCIAL", "RUT", "DOMICILIO", "CORREO DE CONTACTO", "CIUDAD"]}
    />
  );
}
