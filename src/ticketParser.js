class TicketParser {
  constructor() {
    this.patterns = {
      flightNumber: /(?:GOL|G3|LA|AF|AZ|AD)\s*(\d{4})/i,
      date: /(?:Quinta|Quarta|Segunda|Terça|Sexta|Sábado|Domingo),?\s+(\d{1,2})\s+(?:Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)/i,
      time: /(\d{1,2}):(\d{2})\s*(?:AM|PM|am|pm)/i,
      airport: /(?:BRASILIA|BSB|REC|SDU|GIG|CGH|SAO PAULO|CONGONH|SANTOS DUMONT|GALEÃO|GUARULHOS)/i,
      departure: /(?:Partida|Departure)[\s\S]*?(\d{1,2}):(\d{2})(?:AM|PM)?/i,
      arrival: /(?:Chegada|Arrival)[\s\S]*?(\d{1,2}):(\d{2})(?:AM|PM)?/i,
      duration: /(\d+)\s*(?:horas|hours)?\s*e?\s*(\d+)?\s*(?:minutos|minutes)?/i,
      airline: /(?:GOL|LATAM|AZUL|UNITED|AMERICAN|DELTA)\s+(?:LINHAS?|AIRLINES)?/i
    };
  }

  parseTicketEmail(emailText) {
    try {
      const tickets = [];
      const flightSections = emailText.split(/(?=GOL|LATAM|AZUL|G3|LA|AF|AZ|AD)/i);

      for (const section of flightSections) {
        if (section.length < 50) continue;

        const ticket = this.extractFlightDetails(section, emailText);
        if (ticket) {
          tickets.push(ticket);
        }
      }

      return tickets;
    } catch (error) {
      console.error('Erro ao fazer parse do email:', error);
      return [];
    }
  }

  extractFlightDetails(section, fullEmail) {
    try {
      const flightMatch = section.match(/(?:G3|LA|AZ|AD)\s*(\d{4})/);
      const flightNumber = flightMatch ? flightMatch[1] : null;

      if (!flightNumber) return null;

      const dateMatch = section.match(/(?:Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo),?\s+(\d{1,2})\s+(?:de\s+)?(?:Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)/i);
      
      if (!dateMatch) return null;

      const day = dateMatch[1];
      const monthStr = dateMatch[0].match(/(?:Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)/i)[0];
      const month = this.monthToNumber(monthStr);

      const departureMatch = section.match(/Partida[\s\S]{0,100}?(\d{1,2}):(\d{2})\s*(?:AM|PM)?/i);
      const depHour = departureMatch ? parseInt(departureMatch[1]) : null;
      const depMin = departureMatch ? parseInt(departureMatch[2]) : 0;

      const arrivalMatch = section.match(/Chegada[\s\S]{0,100}?(\d{1,2}):(\d{2})\s*(?:AM|PM)?/i);
      const arrHour = arrivalMatch ? parseInt(arrivalMatch[1]) : null;
      const arrMin = arrivalMatch ? parseInt(arrivalMatch[2]) : 0;

      if (!depHour || !arrHour) return null;

      const durationMatch = section.match(/Duração[\s\S]{0,50}?(\d+)\s*(?:horas?|hours?)\s+e?\s*(\d+)?\s*(?:minuto|minutes?)?/i);
      const flightDuration = durationMatch ? (parseInt(durationMatch[1]) * 60 + (durationMatch[2] ? parseInt(durationMatch[2]) : 0)) : null;

      const airports = section.match(/(?:BRASILIA|BSB|REC|SDU|GIG|CGH|SAO PAULO|CONGONH|SANTOS DUMONT|GALEÃO|GUARULHOS)/gi);
      const origin = airports && airports.length > 0 ? airports[0] : 'Unknown';
      const destination = airports && airports.length > 1 ? airports[1] : 'Unknown';

      const now = new Date();
      let year = now.getFullYear();
      const flightDate = new Date(year, month - 1, parseInt(day), depHour, depMin);
      
      if (flightDate < now) {
        year++;
        flightDate.setFullYear(year);
      }

      return {
        flightNumber,
        airline: this.extractAirline(section),
        origin,
        destination,
        departureTime: new Date(year, month - 1, parseInt(day), depHour, depMin),
        arrivalTime: new Date(year, month - 1, parseInt(day), arrHour, arrMin),
        duration: flightDuration,
        raw: section
      };
    } catch (error) {
      console.error('Erro ao extrair detalhes do voo:', error);
      return null;
    }
  }

  monthToNumber(monthStr) {
    const months = {
      'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4,
      'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
      'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12,
      'january': 1, 'february': 2, 'march': 3, 'april': 4,
      'may': 5, 'june': 6, 'july': 7, 'august': 8,
      'september': 9, 'october': 10, 'november': 11, 'december': 12
    };
    return months[monthStr.toLowerCase()] || 1;
  }

  extractAirline(section) {
    const match = section.match(/(?:GOL|LATAM|AZUL)/i);
    return match ? match[0].toUpperCase() : 'Unknown';
  }
}

module.exports = TicketParser;
