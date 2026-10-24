export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2].substring(0, 2);
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const mIdx = parseInt(month, 10) - 1;
      return `${day} ${months[mIdx] || month} ${year}`;
    }
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatTime = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return (
      d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC'
    );
  } catch {
    return isoString;
  }
};

export const formatDateTime = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const datePart = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const timePart = d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
    return `${datePart} ${timePart} UTC`;
  } catch {
    return isoString;
  }
};

export const getSettlementPeriodTimeWindow = (sp) => {
  if (!sp || sp < 1 || sp > 48) return 'N/A';
  const startMins = (sp - 1) * 30;
  const endMins = sp * 30;

  const startH = String(Math.floor(startMins / 60)).padStart(2, '0');
  const startM = String(startMins % 60).padStart(2, '0');
  const endH = String(Math.floor(endMins / 60)).padStart(2, '0');
  const endM = String(endMins % 60).padStart(2, '0');

  return `${startH}:${startM} - ${endH}:${endM}`;
};

export const isJanuary2026 = (dateStr) => {
  if (!dateStr) return false;
  return dateStr.startsWith('2026-01-');
};

export const validateDateRange = (from, to) => {
  if (!from || !to) return { valid: false, message: 'Both start and end dates are required.' };
  if (from > to) return { valid: false, message: 'Start date cannot be later than end date.' };
  return { valid: true };
};
