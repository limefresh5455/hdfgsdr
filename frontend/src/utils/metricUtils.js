export const formatMW = (val, decimals = 1) => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return (
    Number(val).toLocaleString('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + ' MW'
  );
};

export const formatPercent = (val, decimals = 2) => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return (
    Number(val).toLocaleString('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + '%'
  );
};

export const formatBiasMW = (val, decimals = 1) => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  const num = Number(val);
  const prefix = num > 0 ? '+' : '';
  return (
    prefix +
    num.toLocaleString('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) +
    ' MW'
  );
};

export const formatCorrelation = (val, decimals = 4) => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return Number(val).toFixed(decimals);
};

export const getErrorBadge = (errorMW) => {
  if (errorMW === null || errorMW === undefined || isNaN(errorMW)) {
    return {
      text: 'N/A',
      bg: 'bg-slate-100',
      textCol: 'text-slate-600',
      border: 'border-slate-200',
    };
  }
  if (errorMW > 0) {
    return {
      text: 'Overforecast',
      bg: 'bg-amber-50',
      textCol: 'text-amber-700',
      border: 'border-amber-200',
    };
  }
  if (errorMW < 0) {
    return {
      text: 'Underforecast',
      bg: 'bg-sky-50',
      textCol: 'text-sky-700',
      border: 'border-sky-200',
    };
  }
  return {
    text: 'Exact',
    bg: 'bg-emerald-50',
    textCol: 'text-emerald-700',
    border: 'border-emerald-200',
  };
};
