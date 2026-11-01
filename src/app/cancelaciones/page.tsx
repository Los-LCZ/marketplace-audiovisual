import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED, LegalPage, Ph, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Política de cancelación",
  description: "Cuándo se puede cancelar una reserva en Señal, qué pasa con las solicitudes sin respuesta y los rechazos.",
};

const sections: LegalSection[] = [
  {
    id: "cliente",
    title: "Si eres cliente",
    body: (
      <>
        <p>
          Puedes cancelar una reserva confirmada o retirar una solicitud desde{" "}
          <Link href="/mis-reservas">Mis sesiones</Link> <strong>mientras no haya empezado el horario reservado</strong>.
          Al cancelar, el horario queda libre para otras personas.
        </p>
        <p>Una vez que empieza la reserva ya no se puede cancelar desde la plataforma.</p>
      </>
    ),
  },
  {
    id: "anfitrion",
    title: "Si eres anfitrión",
    body: (
      <>
        <p>
          También puedes cancelar una reserva confirmada desde tu panel <strong>antes de que empiece</strong>. Cancelar
          reservas confirmadas afecta la experiencia de tus clientes: hazlo solo cuando no tengas alternativa y avísales
          con la mayor anticipación posible.
        </p>
        <p>Para dejar de recibir reservas sin cancelar las existentes, pausa el espacio desde tu panel.</p>
      </>
    ),
  },
  {
    id: "solicitudes",
    title: "Solicitudes sin respuesta",
    body: (
      <p>
        Una solicitud que el anfitrión no acepta ni rechaza <strong>vence automáticamente cuando empieza el horario</strong>{" "}
        pedido. Aparece como &quot;Vencida&quot; en el historial de ambos y no genera ningún cargo.
      </p>
    ),
  },
  {
    id: "rechazos",
    title: "Rechazos",
    body: (
      <p>
        El anfitrión puede rechazar una solicitud antes de que empiece el horario. <strong>Un rechazo no tiene costo</strong>{" "}
        para el cliente ni para el anfitrión, y el cliente puede buscar otro espacio de inmediato.
      </p>
    ),
  },
  {
    id: "pagos",
    title: "Pagos y reembolsos",
    soon: true,
    body: (
      <>
        <p>
          Por ahora Señal no cobra en línea, así que no hay montos que reembolsar a través de la plataforma. Cuando
          activemos los pagos publicaremos aquí los plazos de cancelación con reembolso total o parcial, cómo se devuelve
          el dinero y qué pasa con la tarifa de servicio.
        </p>
        <p>Te avisaremos antes de que esas condiciones entren en vigor.</p>
      </>
    ),
  },
  {
    id: "problemas",
    title: "Problemas con una reserva",
    body: (
      <p>
        Si el espacio no estaba disponible, no correspondía a la ficha o tuviste otro problema, escríbenos a{" "}
        <Ph>CORREO DE CONTACTO</Ph> con el detalle de la reserva. Esta política no limita los derechos que te otorga la
        Ley 19.496 de protección al consumidor.
      </p>
    ),
  },
];

export default function CancelacionesPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Política de cancelación"
      updated={LEGAL_UPDATED}
      intro={
        <p className="dim">
          Cómo funcionan hoy las cancelaciones, las solicitudes que vencen y los rechazos. Forma parte de los{" "}
          <Link className="acc" href="/terminos">
            Términos y condiciones
          </Link>
          .
        </p>
      }
      sections={sections}
      pending={["CORREO DE CONTACTO"]}
    />
  );
}
