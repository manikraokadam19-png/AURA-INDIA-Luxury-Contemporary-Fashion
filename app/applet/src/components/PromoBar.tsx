import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.ts';

export const PromoBar: React.FC = () => {
  const [promoText, setPromoText] = useState(
    '✦ RANGREZA INDIA | COMPLIMENTARY EXPRESS SHIPPING ACROSS INDIA ON ORDERS ABOVE ₹999 | USE CODE: RANGREZA10 FOR 10% OFF ✦'
  );

  useEffect(() => {
    apiRequest('/api/settings')
      .then((settings) => {
        if (settings?.promoBarText) {
          setPromoText(settings.promoBarText);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="promo-bar text-center py-2 px-3 d-flex align-items-center justify-content-center bg-gradient-rainbow text-white shadow-sm">
      <span className="me-2 d-none d-sm-inline">✨</span>
      <span className="fw-bold text-truncate letter-spacing-1">{promoText}</span>
      <span className="ms-2 d-none d-sm-inline">✨</span>
    </div>
  );
};
