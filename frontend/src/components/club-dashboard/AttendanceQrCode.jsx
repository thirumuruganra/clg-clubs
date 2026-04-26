import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function AttendanceQrCode(props) {
  return <QRCodeSVG {...props} />;
}