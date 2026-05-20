const { google } = require('googleapis');

class CalendarService {
  constructor(serviceAccountJson) {
    this.serviceAccountJson = serviceAccountJson;
    this.calendar = null;
    this.auth = null;
  }

  async authenticate() {
    try {
      this.auth = new google.auth.GoogleAuth({
        credentials: this.serviceAccountJson,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });

      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      console.log('✅ Google Calendar autenticado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao autenticar Google Calendar:', error.message);
      return false;
    }
  }

  async createEvent(calendarId, eventData) {
    try {
      const event = {
        summary: eventData.summary,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime,
          timeZone: 'America/Sao_Paulo'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: 'America/Sao_Paulo'
        },
        transparency: 'opaque',
        visibility: 'private'
      };

      const response = await this.calendar.events.insert({
        calendarId: calendarId,
        resource: event
      });

      console.log(`✅ Evento criado: ${response.data.summary}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao criar evento:', error.message);
      return null;
    }
  }

  async eventExists(calendarId, flightNumber) {
    try {
      const response = await this.calendar.events.list({
        calendarId: calendarId,
        q: flightNumber,
        maxResults: 1
      });

      return response.data.items && response.data.items.length > 0;
    } catch (error) {
      console.error('Erro ao verificar evento:', error.message);
      return false;
    }
  }
}

module.exports = CalendarService;
