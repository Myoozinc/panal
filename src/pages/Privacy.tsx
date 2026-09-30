import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, Database, FileCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Navigation header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo size="md" showText={true} />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/terms">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                Condiciones de Uso
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold mb-4">
            <Shield className="w-3.5 h-3.5" />
            Protección de Datos y Privacidad
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Política de Privacidad
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-2">
            Última actualización: Septiembre de 2026 • Estándar Internacional RGPD / CCPA
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10 text-left text-sm sm:text-base leading-relaxed text-muted-foreground">
        
        {/* Intro */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 text-foreground space-y-2">
          <p className="font-semibold text-base">
            En Panal, valoramos profundamente tu confianza y protegemos la privacidad de tu información personal y artística.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Esta Política de Privacidad describe qué información recopilamos, cómo la utilizamos, cómo la protegemos y los derechos que tienes sobre tus datos personales al utilizar nuestra plataforma web y móvil.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            1. Información que Recopilamos
          </h2>
          <p>
            Recopilamos únicamente la información necesaria para brindarte una experiencia óptima de conexión artística y colaboración:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <strong>Datos de Registro y Autenticación:</strong> Dirección de correo electrónico, nombre o nombre artístico, y contraseña encriptada (al registrarte con correo). Si utilizas <strong>Iniciar sesión con Google (Google OAuth)</strong>, recibimos tu nombre, dirección de correo electrónico verificada y tu foto de perfil pública autorizada por ti.
            </li>
            <li>
              <strong>Datos del Perfil de Artista:</strong> Géneros musicales, habilidades o disciplinas, biografía, enlaces a perfiles públicos externos (Spotify, SoundCloud, Instagram, YouTube), foto de perfil y portafolio musical que decidas compartir.
            </li>
            <li>
              <strong>Interacciones y Contenido de Usuario:</strong> Publicaciones en el feed, solicitudes de conexión (*matches*), mensajes directos y borradores de colaboración generados dentro de la plataforma.
            </li>
            <li>
              <strong>Datos Técnicos y de Navegación:</strong> Dirección IP, tipo de navegador, sistema operativo, identificadores de sesión anónimos y registros de actividad estrictamente orientados a la seguridad y diagnóstico de la infraestructura.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            2. Cumplimiento Especial con la Política de Datos de Usuario de Google
          </h2>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs sm:text-sm space-y-2">
            <p className="font-bold text-primary uppercase tracking-wide">
              Divulgación sobre Servicios de API de Google
            </p>
            <p>
              El uso y la transferencia que hace Panal a cualquier otra aplicación de la información recibida a través de las APIs de Google se adhieren estrictamente a la <strong>Política de Datos de Usuario de los Servicios de API de Google</strong>, incluidos los requisitos de <em>Uso Limitado (Limited Use Requirements)</em>:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Solo solicitamos los permisos estrictamente básicos de perfil (correo electrónico, nombre e imagen de perfil) para crear y autenticar tu cuenta de forma segura.</li>
              <li><strong>NO</strong> utilizamos tus datos obtenidos de Google para mostrar anuncios personalizados ni transferimos dichos datos a corredores de datos (*data brokers*).</li>
              <li><strong>NO</strong> utilizamos los datos obtenidos de Google para entrenar modelos de Inteligencia Artificial fundacionales o de propósito general.</li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            3. Finalidad del Tratamiento de los Datos
          </h2>
          <p>Utilizamos tu información exclusivamente para los siguientes fines:</p>
          <ol className="list-decimal list-inside space-y-1.5 pl-2">
            <li>Crear y administrar tu cuenta de usuario de forma segura.</li>
            <li>Permitir que otros creadores y artistas descubran tu talento y puedan conectar contigo.</li>
            <li>Facilitar la mensajería interna y la redacción de acuerdos de colaboración mutua.</li>
            <li>Detectar, investigar y prevenir fraudes, abusos o violaciones a nuestras Condiciones de Uso.</li>
            <li>Enviar notificaciones operativas esenciales sobre tu cuenta (ej. restablecimiento de contraseña, mensajes nuevos o confirmaciones de verificación).</li>
          </ol>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            4. Compromiso de No Venta de Datos Personales
          </h2>
          <p className="p-4 rounded-xl bg-card border border-border/80 text-foreground font-semibold">
            🚫 <strong>Panal NO vende, alquila, comercializa ni cede tus datos personales ni tus obras a terceros bajo ningún concepto.</strong>
          </p>
          <p>
            Tus datos únicamente son procesados por nuestros proveedores de infraestructura técnica contratados bajo acuerdos de confidencialidad y protección de datos (como Supabase para el almacenamiento seguro de la base de datos y Vercel para el alojamiento de la aplicación).
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            5. Seguridad y Almacenamiento de la Información
          </h2>
          <p>
            Implementamos rigurosas medidas de seguridad técnicas y organizativas para proteger tus datos contra acceso no autorizado, alteración, pérdida o divulgación:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Cifrado de extremo a extremo en tránsito utilizando protocolos modernos HTTPS / TLS 1.3.</li>
            <li>Cifrado de datos en reposo y contraseñas hasheadas mediante algoritmos de última generación.</li>
            <li>Políticas de seguridad a nivel de base de datos (*Row Level Security - RLS*) que aseguran que ningún usuario pueda acceder a información privada de otro.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            6. Tus Derechos (RGPD, CCPA y Legislación Internacional)
          </h2>
          <p>Sin importar el país en el que te encuentres, dispones de los siguientes derechos sobre tus datos personales:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong>Derecho de Acceso y Rectificación:</strong> Puedes consultar y actualizar tus datos personales en cualquier momento desde los ajustes de tu perfil en la app.</li>
            <li><strong>Derecho de Supresión ("Derecho al Olvido"):</strong> Puedes solicitar la eliminación total y permanente de tu cuenta y de todos los datos asociados en cualquier momento.</li>
            <li><strong>Derecho de Oposición y Limitación:</strong> Puedes oponerte a ciertos tratamientos o retirar tu consentimiento en cualquier momento.</li>
            <li><strong>Derecho a la Portabilidad:</strong> Tienes derecho a solicitar una copia de los datos que nos hayas proporcionado en un formato estructurado y legible.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            7. Retención y Eliminación de Datos
          </h2>
          <p>
            Conservamos tus datos personales únicamente durante el tiempo en que tu cuenta permanezca activa. Si decides cerrar tu cuenta o solicitas su eliminación a nuestro equipo, tus datos personales serán borrados de nuestros servidores de producción de manera irreversible en un plazo máximo de 30 días, salvo aquellos registros mínimos que estemos obligados legalmente a conservar para cumplimiento fiscal o prevención de fraude.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            8. Contacto del Responsable de Privacidad
          </h2>
          <p>
            Si tienes cualquier duda sobre esta Política de Privacidad o deseas ejercer tus derechos de acceso, rectificación o eliminación de datos, puedes contactarnos directamente a través del soporte de la aplicación o vía correo electrónico a: <strong>privacidad@panal.app</strong>.
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

export default Privacy;
