import React from 'react';

const pins = [
  { name: 'Delhi DC', top: '28%', left: '42%', status: 'green' },
  { name: 'Mumbai (Azure)', top: '52%', left: '30%', status: 'red' },
  { name: 'Bangalore (Wipro)', top: '70%', left: '38%', status: 'green' },
  { name: 'Chennai (TCS)', top: '68%', left: '46%', status: 'green' },
  { name: 'Hyderabad (Infosys)', top: '58%', left: '40%', status: 'amber' },
  { name: 'Kolkata', top: '42%', left: '62%', status: 'red' },
  { name: 'Pune (HCL)', top: '56%', left: '32%', status: 'green' },
  { name: 'Guwahati', top: '30%', left: '68%', status: 'amber' },
  { name: 'Jaipur', top: '35%', left: '34%', status: 'green' },
  { name: 'Lucknow', top: '34%', left: '48%', status: 'red' },
  { name: 'Chandigarh', top: '24%', left: '38%', status: 'green' },
  { name: 'Trivandrum', top: '82%', left: '38%', status: 'green' },
];

const IndiaMap = React.memo(() => {
  return (
    <>
      <img src="/india-map.png" alt="India Map" draggable={false} />
      {pins.map((pin, i) => (
        <div
          key={i}
          className="map-pin"
          style={{ top: pin.top, left: pin.left }}
          title={`${pin.name} — ${pin.status === 'red' ? 'THREAT' : pin.status === 'amber' ? 'WARNING' : 'OK'}`}
        >
          <div className={`pin-dot ${pin.status}`} />
          <span className="pin-label">{pin.name}</span>
        </div>
      ))}
    </>
  );
});

export default IndiaMap;
