export type ApplicationStatus =
  | 'Interested'
  | 'Applied'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Archived';

export const APPLICATION_STATUS_COLOR: Record<ApplicationStatus, string> = {
  Interested: '#cd93ff',
  Applied: '#70e2ff',
  Interview: '#ffe83f',
  Offer: '#9fff5b',
  Rejected: '#ff75c3',
  Archived: '#ffa647',
};
