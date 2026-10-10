/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import vaporwaveBg from '../assets/images/vaporwave_synthwave_bg_1791619212867.jpg';

export const VaporwaveBackdrop: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* High-fidelity generated 80s vaporwave backdrop image */}
      <img
        src={vaporwaveBg}
        alt="80s vaporwave synthwave neon horizon background"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-bottom opacity-35 filter contrast-125 saturate-125 scale-105 transform -translate-y-4"
      />

      {/* Deep purple & magenta atmospheric gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#090214]/90 via-[#120524]/75 to-[#0a0218]/95" />

      {/* Perspective grid floor glow */}
      <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-pink-600/10 via-purple-900/10 to-transparent" />
    </div>
  );
};
