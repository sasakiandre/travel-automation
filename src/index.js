require('dotenv').config();
const cron = require('node-cron');
const { google } = require('googleapis');

const CalendarService = require('./calendarService');
const TicketParser = require('./ticketParser');

const GMAIL_USER = process.env.GMAIL_USER || 'passagensandresasaki@gmail.com';
const CALENDAR_ID = process.env.CALENDAR_ID || 'passagensandresasaki@gmail.com';
const EMAIL_FROM_DOMAIN = process.env.EMAIL_FROM_DOMAIN || 'confirmation@sabre.com';
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '*/30 * * * *';

let serviceAccountJson;
try {
  serviceAccountJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
} catch (error) {
  console.error('❌ Erro ao parsear GOOGLE_SERVICE_ACCOUNT_JSON');
  process.exit(1);
}

const calendarService = new CalendarService(serviceAccountJson);
const ticketParser = new TicketParser();
const processedEmails = new Set();

let gmailAuth = null;
let gmailApi = null;

async function authenticateGmail() {
  try {
    gmailAuth = new google.auth.GoogleAuth({
      credentials: serviceAccountJson,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly']
    });

    gmailApi = google.gmail({ version: 'v1', auth: gmailAuth });
    console.log('✅ Gmail API autenticada com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao autenticar Gmail API:', error.message);
    return false;
  }
}

async function fetchEmailsFromGmail() {
  try {
    const response = await gmailApi.users.messages.list({
      userId: 'me',
      q: `from:${EMAIL_FROM_DOMAIN}`,
      maxResults: 10
    });

    if (!response.data.messages || response.data.messages.length === 0) {
      return [];
    }

    const emails = [];

    for (const message of response.data.messages) {
      const msg = await gmailApi.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      });

      const headers = msg.data.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      let body = '';
      if (msg.data.payload.body && msg.data.payload.body.data) {
        body = Buffer.from(msg.data.payload.body.data, 'base64').toString();
      } else if (msg.data.payload.parts) {
        for (const part of msg.data.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body.data) {
            body = Buffer.from(part.body.data, 'base64').toString();
            break;
          }
        }
      }

      emails.push({
        id: message.id,
        subject,
        from,
        date,
        text: body
      });
    }

    return emails;
  } catch (error) {
    console.error('Erro ao buscar emails:', error.message);
    return [];
  }
}

async function processFlights() {
  try {
    console.log(`\n🔍 Verificando emails de passagens... [${new Date().toLocaleString('pt-BR')}]`);

    const emails = await fetchEmailsFromGmail();
    
    if (emails.length === 0) {
      console.log('ℹ️  Nenhum email encontrado');
      return;
    }

    console.log(`📧 ${emails.length} email(s) encontrado(s)`);

    for (const email of emails) {
      const emailKey = `${email.from}-${email.date}`;
      
      if (processedEmails.has(emailKey)) {
        continue;
      }

      const flights = ticketParser.parseTicketEmail(email.text);

      if (flights.length === 0) {
        console.log(`⚠️  Nenhum voo encontrado em: ${email.subject}`);
        processedEmails.add(emailKey);
        continue;
      }

      for (const flight of flights) {
        const eventAlreadyExists = await calendarService.eventExists(CALENDAR_ID, flight.flightNumber);
        
        if (eventAlreadyExists) {
          console.log(`ℹ️  Voo ${flight.flightNumber} já foi processado`);
          continue;
        }

        const twoHoursBefore = new Date(flight.departureTime);
        twoHoursBefore.setHours(twoHoursBefore.getHours() - 2);

        const preFlightEvent = {
          summary: 'Viagem',
          description: `Voo ${flight.airline} ${flight.flightNumber} - ${flight.origin} → ${flight.destination}\nBloqueio pré-voo (2h antes)`,
          startTime: twoHoursBefore.toISOString(),
          endTime: flight.departureTime.toISOString()
        };

        await calendarService.createEvent(CALENDAR_ID, preFlightEvent);

        const duringFlightEvent = {
          summary: 'Viagem',
          description: `Voo ${flight.airline} ${flight.flightNumber} - ${flight.origin} → ${flight.destination}\nDurante o voo`,
          startTime: flight.departureTime.toISOString(),
          endTime: flight.arrivalTime.toISOString()
        };

        await calendarService.createEvent(CALENDAR_ID, duringFlightEvent);

        const twoHoursAfter = new Date(flight.arrivalTime);
        twoHoursAfter.setHours(twoHoursAfter.getHours() + 2);

        const postFlightEvent = {
          summary: 'Viagem',
          description: `Voo ${flight.airline} ${flight.flightNumber} - ${flight.origin} → ${flight.destination}\nBloqueio pós-voo (2h depois)`,
          startTime: flight.arrivalTime.toISOString(),
          endTime: twoHoursAfter.toISOString()
        };

        await calendarService.createEvent(CALENDAR_ID, postFlightEvent);

        console.log(`✅ Voo ${flight.flightNumber} processado com sucesso!`);
      }

      processedEmails.add(emailKey);
    }
  } catch (error) {
    console.error('❌ Erro ao processar voos:', error);
  }
}

async function init() {
  console.log('🚀 Iniciando Travel Automation...');
  console.log(`📅 Calendário: ${CALENDAR_ID}`);
  console.log(`📧 Gmail: ${GMAIL_USER}`);
  console.log(`⏰ Agendamento: ${CRON_SCHEDULE}`);

  const gmailAuth = await authenticateGmail();
  if (!gmailAuth) {
    console.error('❌ Falha na autenticação com Gmail');
    process.exit(1);
  }

  const calendarAuth = await calendarService.authenticate();
  if (!calendarAuth) {
    console.error('❌ Falha na autenticação com Google Calendar');
    process.exit(1);
  }

  await processFlights();

  cron.schedule(CRON_SCHEDULE, async () => {
    await processFlights();
  });

  console.log('✅ Travel Automation iniciado com sucesso!');
}

init().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
