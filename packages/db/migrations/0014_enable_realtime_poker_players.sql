-- Enable realtime for poker_players table so frontend gets live updates
ALTER PUBLICATION supabase_realtime ADD TABLE poker_players;
