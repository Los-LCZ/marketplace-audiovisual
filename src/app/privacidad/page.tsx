import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED, LegalPage, Ph, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos personales guarda Señal, para qué los usa, con quién los comparte y cómo ejercer tus derechos.",
};

const sections: LegalSection[] = [
  {
    id: "responsable",
    title: "Quién es responsable de tus datos",
    body: (
      <p>
        El responsable del tratamiento de tus datos personales es <Ph>RAZÓN SOCIAL</Ph>, RUT <Ph>RUT</Ph>, con domicilio
        en <Ph>DOMICILIO</Ph>. Para cualquier consulta sobre privacidad escribe a <Ph>CORREO DE CONTACTO</Ph>. Esta
        política se rige por la Ley 19.628 sobre protección de la vida privada y por la Ley 21.719, que la moderniza.
      </p>
    ),
  },
  {
    id: "datos",
    title: "Qué datos guardamos",
    body: (
      <ul>
        <li>
          <strong>Cuenta:</strong> nombre, correo, teléfono (opcional) y contraseña (guardada cifrada; nunca la vemos).
        </li>
        <li>
          <strong>Perfil:</strong> titular, biografía, comuna, etiquetas, foto y la nota mínima que pides como anfitrión.
        </li>
        <li>
          <strong>Espacios:</strong> dirección, descripción, fotos, equipamiento, horario y precio de lo que publicas.
        </li>
        <li>
          <strong>Reservas:</strong> espacio, fechas, horas, montos, estado y el proyecto o mensaje que envías al
          anfitrión.
        </li>
        <li>
          <strong>Calificaciones y reseñas</strong> que das y recibes, y los espacios que marcas con me gusta o descartas.
        </li>
        <li>
          <strong>Datos técnicos:</strong> la cookie de sesión y registros básicos del servidor (fecha, ruta y errores)
          para operar y proteger el sitio.
        </li>
      </ul>
    ),
  },
  {
    id: "finalidad",
    title: "Para qué los usamos",
    body: (
      <ul>
        <li>Crear y mantener tu cuenta, e iniciar sesión.</li>
        <li>Mostrar los espacios y gestionar reservas y solicitudes.</li>
        <li>Enviarte los correos de tu cuenta (confirmación de registro y recuperación de contraseña).</li>
        <li>Calcular y mostrar las calificaciones de clientes, anfitriones y espacios.</li>
        <li>Prevenir fraudes, abusos y usos contrarios a los Términos.</li>
        <li>Cumplir obligaciones legales.</li>
      </ul>
    ),
  },
  {
    id: "visibilidad",
    title: "Qué ven otras personas",
    body: (
      <>
        <p>
          Tu perfil público (nombre, foto, titular, comuna, etiquetas, calificaciones reveladas y los espacios publicados)
          es visible para cualquier visitante. Tu correo no se muestra.
        </p>
        <p>
          <strong>Tu teléfono solo lo ven las contrapartes de una reserva:</strong> el anfitrión del espacio que
          reservaste o el cliente que reservó tu espacio.
        </p>
      </>
    ),
  },
  {
    id: "proveedores",
    title: "Proveedores con los que compartimos datos",
    body: (
      <>
        <p>No vendemos tus datos. Los compartimos solo con proveedores que necesitamos para operar Señal:</p>
        <ul>
          <li>
            <strong>Supabase</strong>: base de datos, autenticación, almacenamiento de fotos y envío de correos de la
            cuenta.
          </li>
          <li>
            <strong>Vercel</strong>: alojamiento del sitio y registros técnicos de las visitas.
          </li>
        </ul>
        <p>
          Estos proveedores pueden almacenar datos fuera de Chile. Los elegimos porque ofrecen garantías adecuadas de
          seguridad y confidencialidad. También podemos entregar datos cuando lo exija una autoridad competente.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        Usamos solo cookies necesarias: las de sesión, para mantenerte conectado, y una preferencia para recordar el
        mundo que elegiste (Audiovisual o Música). No usamos cookies de publicidad ni de seguimiento de terceros.
      </p>
    ),
  },
  {
    id: "conservacion",
    title: "Cuánto tiempo los guardamos",
    body: (
      <p>
        Mientras tu cuenta esté activa. Si la cierras, eliminamos o anonimizamos tus datos, salvo los que debamos conservar
        por obligación legal o para resolver reclamos pendientes. Las reservas y calificaciones en las que participó otra
        persona pueden conservarse de forma anonimizada para mantener el historial de esa persona.
      </p>
    ),
  },
  {
    id: "derechos",
    title: "Tus derechos y cómo ejercerlos",
    body: (
      <>
        <p>Puedes pedir en cualquier momento:</p>
        <ul>
          <li>
            <strong>Acceso:</strong> saber qué datos tuyos tenemos.
          </li>
          <li>
            <strong>Rectificación:</strong> corregir datos inexactos (la mayoría los puedes editar en{" "}
            <Link href="/perfil">tu perfil</Link>).
          </li>
          <li>
            <strong>Eliminación:</strong> que borremos tus datos cuando ya no sean necesarios.
          </li>
          <li>
            <strong>Oposición, portabilidad y bloqueo</strong>, en los términos de la Ley 21.719.
          </li>
        </ul>
        <p>
          Escribe a <Ph>CORREO DE CONTACTO</Ph> desde el correo de tu cuenta indicando qué derecho quieres ejercer.
          Responderemos dentro de los plazos legales. Si no quedas conforme, puedes recurrir a la autoridad de protección
          de datos personales.
        </p>
      </>
    ),
  },
  {
    id: "seguridad",
    title: "Seguridad",
    body: (
      <p>
        Usamos conexiones cifradas (HTTPS), contraseñas cifradas y reglas de acceso en la base de datos para que cada
        persona vea solo lo que le corresponde. Ningún sistema es infalible: si detectamos un incidente que afecte tus
        datos, te avisaremos según exige la ley.
      </p>
    ),
  },
  {
    id: "cambios",
    title: "Cambios a esta política",
    body: (
      <p>
        Si cambiamos esta política de forma relevante, lo avisaremos en el sitio o por correo antes de que entre en vigor.
      </p>
    ),
  },
];

export default function PrivacidadPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Política de privacidad"
      updated={LEGAL_UPDATED}
      intro={
        <p className="dim">
          Qué datos guardamos, para qué, quién los ve y cómo puedes pedir verlos, corregirlos o borrarlos.
        </p>
      }
      sections={sections}
      pending={["RAZÓN SOCIAL", "RUT", "DOMICILIO", "CORREO DE CONTACTO"]}
    />
  );
}
