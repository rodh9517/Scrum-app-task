
export const sendInvitationEmail = (toEmail: string, workspaceName: string, inviterName: string, inviterEmail?: string) => {
  const subject = `Invitación a colaborar: ${workspaceName}`;
  
  const body = `Hola,

${inviterName} te ha invitado a colaborar en el espacio de trabajo "${workspaceName}" en Scrum Task Dashboard.

Para unirte y ver los proyectos en tiempo real:
1. Ingresa a la aplicación: ${window.location.origin}
2. Inicia sesión con este correo electrónico (${toEmail}).

¡Esperamos verte pronto!
`;

  // Try to open webmail in browser if provider is known based on sender's email
  if (inviterEmail) {
      const domain = inviterEmail.split('@')[1]?.toLowerCase();
      
      // Added hermosillo.com as it uses Google Workspace
      if (domain === 'gmail.com' || domain === 'googlemail.com' || domain === 'hermosillo.com') {
           // Gmail Web
           const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
           window.open(gmailUrl, '_blank');
           return;
      } else if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) {
           // Outlook / Hotmail Web
           const outlookUrl = `https://outlook.live.com/owa/?path=/mail/action/compose&to=${encodeURIComponent(toEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
           window.open(outlookUrl, '_blank');
           return;
      } else if (['yahoo.com', 'ymail.com', 'rocketmail.com'].includes(domain)) {
           // Yahoo Mail Web
           const yahooUrl = `https://compose.mail.yahoo.com/?to=${encodeURIComponent(toEmail)}&subj=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
           window.open(yahooUrl, '_blank');
           return;
      }
  }

  // Fallback to system default (mailto) for other domains or if no inviter email provided
  const mailtoLink = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Open the email client
  window.open(mailtoLink, '_blank');
};