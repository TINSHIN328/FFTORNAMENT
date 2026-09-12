import React, { useState } from 'react';
import { Trophy, Users } from 'lucide-react';
import { useApp } from '../store';
import { Card, Avatar, EmptyState, Select } from '../components/ui';

export default function Leaderboard() {
  const { state, getLeaderboard } = useApp();
  const [gameFilter, setGameFilter] = useState('');
  const leaderboard = getLeaderboard();

  if (leaderboard.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Leaderboard</h1>
            <p className="text-text-muted text-sm mt-1">Top competitive players this season</p>
          </div>
        </div>
        <EmptyState
          icon={<Trophy size={32} />}
          title="No rankings yet"
          description="Players will appear on the leaderboard once they participate in tournaments and complete matches."
        />
      </div>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Leaderboard</h1>
          <p className="text-text-muted text-sm mt-1">Top competitive players this season</p>
        </div>
        <Select value={gameFilter} onChange={e => setGameFilter(e.target.value)} options={[{ value: '', label: 'All Games' }, ...state.games.map(g => ({ value: g.id, label: g.name }))]} />
      </div>

      {/* Top 3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {top3.map((entry, i) => {
            const medals = ['🥇', '🥈', '🥉'];
            const colors = ['border-warning/50 bg-warning/5', 'border-text-muted/50 bg-white/[0.02]', 'border-accent/30 bg-accent/5'];
            return (
              <Card key={entry.userId} hover={false} className={`text-center py-8 border ${colors[i]}`}>
                <div className="text-4xl mb-3">{medals[i]}</div>
                <Avatar name={entry.username} size="lg" />
                <h3 className="text-lg font-bold text-white mt-3">{entry.username}</h3>
                <p className="text-2xl font-bold gradient-text mt-2">{entry.points} pts</p>
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-text-muted">
                  <span className="text-success">{entry.wins}W</span>
                  <span className="text-danger">{entry.losses}L</span>
                  <span>{entry.championships} 🏆</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rest */}
      {rest.length > 0 && (
        <Card hover={false}>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Points</th>
                  <th>Wins</th>
                  <th>Losses</th>
                  <th>Win Rate</th>
                  <th>Tournaments</th>
                  <th>Championships</th>
                </tr>
              </thead>
              <tbody>
                {rest.map(entry => {
                  const wr = entry.wins + entry.losses > 0 ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100) : 0;
                  return (
                    <tr key={entry.userId}>
                      <td><span className="text-sm font-bold text-text-muted">#{entry.rank}</span></td>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={entry.username} size="sm" />
                          <span className="text-sm font-medium text-white">{entry.username}</span>
                        </div>
                      </td>
                      <td><span className="text-sm font-bold text-primary">{entry.points}</span></td>
                      <td><span className="text-sm text-success">{entry.wins}</span></td>
                      <td><span className="text-sm text-danger">{entry.losses}</span></td>
                      <td><span className="text-sm text-text">{wr}%</span></td>
                      <td><span className="text-sm text-text-muted">{entry.tournamentsPlayed}</span></td>
                      <td><span className="text-sm text-warning">{entry.championships}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
