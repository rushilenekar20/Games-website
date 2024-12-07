export interface Player {
    name: string;
    bestThrow: number;
    currentTurn: boolean;
  }
  
  export interface GameMode {
    type: 'single' | 'multi';
    players: Player[];
    currentPlayerIndex: number;
  }