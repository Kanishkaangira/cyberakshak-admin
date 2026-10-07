export default function StatCards({ events, counts }) {
  const items = [
    { label: 'Coming', value: counts.coming, tone: 'brand' },
    { label: 'Ongoing', value: counts.ongoing, tone: 'green' },
    { label: 'Archived', value: counts.archived, tone: 'gray' },
    { label: 'All events', value: events.length, tone: 'orange' },
  ];
  return (
    <section className="stats">
      {items.map((s) => (
        <div key={s.label} className={`stat ${s.tone}`}>
          <span>{s.label}</span>
          <strong>{s.value || 0}</strong>
        </div>
      ))}
    </section>
  );
}