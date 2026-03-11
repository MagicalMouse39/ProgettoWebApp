export interface Horse {
  id: string;
  name: string;
  stable_id?: string;
  owner_id?: string;
  birth_date?: string;
  microchip?: string;
  breed?: string;
  gender: 'stallion' | 'mare' | 'gelding';
  created_at?: string;
}
