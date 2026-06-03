import React from 'react';
import './Status.css';

const Status = ({ value }) => {
  const normalizedValue = (value ?? 'Unknown')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');

  return (
    <span className={`status ${normalizedValue}`}>
      {value || 'Unknown'}
    </span>
  );
};

export default Status;