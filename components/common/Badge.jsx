'use client';

import React from 'react';

export default function Badge({ status, text }) {
  const s = text || status || '';
  let cls = '';

  if (['Paid', 'Received', 'Cash', 'Online', 'Settled', 'In Stock', 'Active', 'Approved', 'Ready for Delivery', 'Delivered', 'Delivered & Closed'].includes(s)) {
    cls = 'success';
  } else if (['Partial', 'Adjusted', 'Low Stock', 'Checking', 'Waiting for Approval', 'Waiting for Part', 'High', 'Repair Approved'].includes(s)) {
    cls = 'warning';
  } else if (['Unpaid', 'Out of Stock', 'Voided', 'Cancelled', 'Inactive', 'Declined', 'Repair Declined', 'Urgent'].includes(s)) {
    cls = 'danger';
  }

  return (
    <span className={`badge ${cls}`}>
      {s}
    </span>
  );
}
