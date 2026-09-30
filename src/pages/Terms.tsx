import { Link } from "react-router-dom";
import { ArrowLeft, Shield, FileText, Lock, Scale } from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Navigation header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo size="md" showText={true} />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/privacy">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                Política de Privacidad
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero header */}
      <div className="border-b border-border/40 bg-gradient-to-b from-primary/5 via-transparent to-transparent py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Scale className="w-3.5 h-3.5" />
            Marco Legal y Condiciones del Servicio
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Condiciones de Uso y Términos del Servicio
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-2">
            Última actualización: Septiembre de 2026 • Versión 2.0 Global
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10 text-left text-sm sm:text-base leading-relaxed text-muted-foreground">
        
        {/* Intro callout */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 text-foreground space-y-2">
          <p className="font-semibold text-base">
            Bienvenido/a a Panal. Por favor, lee atentamente estas Condiciones antes de utilizar nuestra plataforma.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Al registrarte, acceder o utilizar el sitio web, las aplicaciones web o móviles de Panal (en adelante, "el Servicio" o "la Plataforma"), aceptas quedar legalmente vinculado/a por estas Condiciones de Uso. Si no estás de acuerdo con alguno de los términos, debes abstenerte de usar la Plataforma.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            1. Naturaleza del Servicio e Intermediación Técnica
          </h2>
          <p>
            <strong>Panal</strong> es una plataforma de software y red social concebida para conectar artistas, músicos, productores, vocalistas, creadores y profesionales del sector cultural con fines de comunicación, descubrimiento mutuo (*matchmaking*), intercambio de ideas y facilitación de colaboraciones.
          </p>
          <p>
            <strong>Panal NO es:</strong> una agencia de representación artística (*talent agency*), ni un sello discográfico (*record label*), ni una sociedad de gestión colectiva de derechos de autor, ni una entidad financiera, ni un bufete de abogados, ni un árbitro vinculante. 
          </p>
          <p>
            Cualquier colaboración, proyecto conjunto, acuerdo comercial, cesión de derechos, división de regalías (*split sheets*) o contrato pactado entre los usuarios de la plataforma se realiza bajo su <strong>exclusiva cuenta y riesgo</strong>. Panal no es parte de dichos acuerdos ni garantiza su cumplimiento por ninguna de las partes.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            2. Exclusión Total de Garantías ("Tal Cual" y "Según Disponibilidad")
          </h2>
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-xs sm:text-sm space-y-2">
            <p className="font-bold text-destructive uppercase tracking-wide">
              Aviso Legal Esencial de Garantías
            </p>
            <p>
              EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY APLICABLE EN CUALQUIER JURISDICCIÓN, EL SERVICIO SE OFRECE ESTRICTAMENTE <strong>"TAL CUAL" ("AS IS")</strong> Y <strong>"SEGÚN DISPONIBILIDAD" ("AS AVAILABLE")</strong>.
            </p>
            <p>
              LOS DESARROLLADORES, PROPIETARIOS, OPERADORES, AFILIADOS Y PROVEEDORES DE PANAL DESCONOCEN Y RECHAZAN EXPRESAMENTE TODA GARANTÍA, CONDICIÓN O DECLARACIÓN DE CUALQUIER TIPO, SEAN EXPRESAS, IMPLÍCITAS, LEGALES O DE OTRO TIPO, INCLUYENDO, SIN LIMITACIÓN:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Garantías implícitas de comerciabilidad, idoneidad para un propósito particular y no infracción de derechos de terceros.</li>
              <li>Que el servicio sea ininterrumpido, oportuno, seguro o libre de errores, virus o componentes dañinos.</li>
              <li>La exactitud, veracidad o confiabilidad del contenido publicado por otros usuarios o de las sugerencias generadas por herramientas de Inteligencia Artificial.</li>
              <li>El éxito comercial, económico o artístico de cualquier colaboración iniciada en la plataforma.</li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            3. Limitación Integral de Responsabilidad
          </h2>
          <p>
            EN LA MÁXIMA MEDIDA PERMITIDA POR LAS LEYES APLICABLES DE CUALQUIER PAÍS O JURISDICCIÓN, BAJO NINGUNA CIRCUNSTANCIA NI TEORÍA LEGAL (RESPONSABILIDAD CONTRACTUAL, EXTRACONTRACTUAL, NEGLIGENCIA, RESPONSABILIDAD OBJETIVA O CUALQUIER OTRA), LA EMPRESA, SUS DESARROLLADORES, CREADORES, DIRECTORES, EMPLEADOS, AGENTES O LICENCIANTES SERÁN RESPONSABLES ANTE EL USUARIO NI ANTE TERCEROS POR:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <strong>Daños indirectos, incidentales, especiales, consecuentes o punitivos:</strong> Incluyendo, sin limitación, pérdida de beneficios o ingresos, pérdida de contratos, pérdida de oportunidades de negocio, lucro cesante, daño a la reputación comercial, pérdida o corrupción de datos o interrupción de la actividad.
            </li>
            <li>
              <strong>Disputas entre usuarios:</strong> Cualquier controversia, desacuerdo sobre créditos, propiedad de pistas, stems, grabaciones fonográficas, letras de canciones, regalías de streaming o derechos de autor derivadas de interacciones en el servicio.
            </li>
            <li>
              <strong>Conducta de terceros o usuarios:</strong> Acciones difamatorias, ofensivas, ilícitas, fraudulentas o de acoso cometidas por otros usuarios en los chats, publicaciones o perfiles.
            </li>
            <li>
              <strong>Acceso no autorizado o ciberataques:</strong> Vulneraciones de seguridad ajenas al control razonable de la plataforma.
            </li>
          </ul>
          <p className="p-3 bg-muted/30 rounded-xl text-xs sm:text-sm border border-border/30">
            <strong>Límite monetario máximo:</strong> Si a pesar de lo anterior una autoridad judicial competente determina alguna responsabilidad legal de los operadores de Panal, la responsabilidad económica total acumulada ante ti por todos los reclamos no superará en ningún caso el monto mayor entre: (a) el monto total que hayas pagado a Panal en los doce (12) meses anteriores al hecho, o (b) la suma de cincuenta dólares estadounidenses ($50.00 USD).
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            4. Indemnización y Obligación de Mantener Indemne
          </h2>
          <p>
            Aceptas defender, indemnizar y mantener completamente indemne a <strong>Panal</strong>, a su equipo fundador, programadores, empresas afiliadas, sucesores y contratistas frente a cualquier reclamo, demanda, daño, obligación, pérdida, responsabilidad, costo, multa o gasto (incluyendo honorarios razonables de abogados) que surjan de o se relacionen con:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 pl-2">
            <li>Tu uso, uso indebido o imposibilidad de uso de la Plataforma.</li>
            <li>Tu violación o incumplimiento de cualquiera de las disposiciones de estas Condiciones.</li>
            <li>Cualquier contenido, audio, video, imagen o texto que subas, compartas o transmitas a través del Servicio.</li>
            <li>La vulneración por tu parte de los derechos de cualquier tercero, incluidos, entre otros, derechos de autor (*copyright*), marcas comerciales, patentes, secretos comerciales o derechos de privacidad.</li>
            <li>Cualquier disputa o acuerdo legal/financiero celebrado entre tú y otros miembros de la comunidad.</li>
          </ol>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            5. Propiedad Intelectual y Política DMCA / Derechos de Autor
          </h2>
          <p>
            <strong>Tus derechos:</strong> Conservas en todo momento la titularidad y derechos de propiedad intelectual sobre el contenido original que subas a Panal (canciones, maquetas, letras, pistas de audio, logotipos e imágenes).
          </p>
          <p>
            <strong>Garantía del usuario:</strong> Al subir o vincular material (mediante Spotify, YouTube, SoundCloud o subida directa), declaras y garantizas que eres el autor legítimo o cuentas con las licencias, consentimientos y autorizaciones por escrito de todos los titulares de derechos para publicar dicho material. Queda estrictamente prohibido subir material protegido sin autorización previa.
          </p>
          <p>
            <strong>Licencia limitada para operar el servicio:</strong> Al publicar contenido, otorgas a Panal una licencia mundial, no exclusiva, gratuita y libre de regalías con el único propósito técnico de alojar, procesar, mostrar y reproducir dicho contenido dentro de la plataforma para prestar el servicio solicitado.
          </p>
          <p>
            <strong>Notificación de infracción (DMCA / Takedown):</strong> Si consideras que algún contenido en Panal vulnera tus derechos de propiedad intelectual, puedes remitir una notificación a nuestro equipo legal indicando los datos de la obra y el enlace infractor a través de nuestro canal de soporte. Panal se reserva el derecho inalienable de suspender o eliminar de inmediato cualquier contenido reportado y cancelar las cuentas de infractores reincidentes sin previo aviso.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            6. Herramientas de Inteligencia Artificial (Collab AI)
          </h2>
          <p>
            Panal incluye funciones asistidas por modelos de lenguaje e Inteligencia Artificial (como el generador de acuerdos de colaboración y asistencia en chat).
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Las plantillas, cláusulas y textos sugeridos por la IA son <strong>meramente referenciales y formativos</strong>.</li>
            <li>No constituyen asesoramiento legal, notarial ni pericial.</li>
            <li>Es responsabilidad exclusiva de cada usuario someter cualquier acuerdo formal a la revisión de un abogado colegiado en su país.</li>
            <li>Panal no asume responsabilidad alguna por la validez jurídica, exigibilidad o consecuencias económicas de los borradores generados por la IA.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            7. Renuncia a Demandas Colectivas y Resolución de Conflictos
          </h2>
          <p>
            En la medida que lo permita el marco legal aplicable, aceptas que cualquier reclamo o controversia contra Panal se resolverá de manera individual, <strong>renunciando expresamente a iniciar, unirte o participar en demandas colectivas (*class actions*)</strong>, acciones de clase, acciones representativas o procedimientos ante jurados populares contra la plataforma o sus desarrolladores.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            8. Modificaciones de las Condiciones
          </h2>
          <p>
            Nos reservamos el derecho de modificar o actualizar estas Condiciones en cualquier momento. Cualquier cambio sustancial será publicado en esta misma página con la fecha de última actualización. El uso continuado de la Plataforma tras la entrada en vigor de los cambios constituye tu aceptación plena de las nuevas condiciones.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            9. Contacto Legal
          </h2>
          <p>
            Para consultas, notificaciones legales o reclamos sobre estas Condiciones, puedes comunicarte con nuestro equipo oficial a través de la sección de soporte de la plataforma o escribiendo a: <strong>soporte@panal.app</strong>.
          </p>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Panal. Todos los derechos reservados.</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link to="/terms" className="hover:text-foreground underline">Condiciones de Uso</Link>
          <Link to="/privacy" className="hover:text-foreground underline">Política de Privacidad</Link>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
