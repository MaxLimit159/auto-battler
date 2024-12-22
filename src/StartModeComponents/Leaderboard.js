import React, { useState} from 'react';
import { characterList } from '../charactersFiles/characters.js';
import { activeSkills } from '../activeSkills.js';
const baseCharacterList = JSON.parse(JSON.stringify(characterList));
export default function Leaderboard ({stageId, viewCharacterDetails, fetchLeaderboard}){
	const [selectedLeaderboard, setSelectedLeaderboard] = useState(null);
	const viewLeaderboard = async (stageId) => {
		const leaderboard = await fetchLeaderboard(stageId);
		const getSkillName = (skillId) => {
			const skill = activeSkills.find(skill => skill.id === skillId);
			return skill ? skill.name : 'Unknown Skill';
		};
		const updatedLeaderboard = leaderboard.map(entry => ({
			...entry,
			used_activeSkills: entry.used_activeSkills.map(skillId => getSkillName(skillId)),
			used_passives: entry.used_passives.map(passive => passive.name),
		}));
		setSelectedLeaderboard(updatedLeaderboard);
	};
	return (
		<>
			{selectedLeaderboard && (
				<div className="outter-modal" onClick={(e) => {e.stopPropagation(); setSelectedLeaderboard(null)}}>
					<div
						className="leaderboard-modal-content"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 className="leaderboard-title">Leaderboard</h2>
						<div className="leaderboard-list">
							{selectedLeaderboard.map((entry, index) => {
								const character = baseCharacterList[entry.character.id];
								return (
									<div
										key={entry.id}
										className={`leaderboard-entry`}
									>
										<div className={`leaderboard-position position-${index + 1}`}>
											{index + 1}
										</div>
										<div className="leaderboard-player-name">
											{entry.player_name || "Anonymous"}
										</div>
										<div className="leaderboard-score">{entry.score}</div>
										<div className="leaderboard-character">
											<div
												className="character-clickable"
												onClick={() => viewCharacterDetails(entry.character.id, entry.character.level, entry.used_passives)}
											>
												<img
													src={character.image}
													alt={`Character ${entry.character.id}`}
												/>
											</div>
										</div>
										<div className="leaderboard-skills">
											<span className="leaderboard-skill-text">
												Skills: <b>{entry.used_activeSkills.join(" / ") || "None"}</b>
											</span>
										</div>
									</div>
								)})
							}
						</div>
					</div>
				</div>
			)}
			<button onClick={() => viewLeaderboard(stageId)}>
				<i className="fa fa-trophy" style={{ marginRight: '8px' }}></i>
				Leaderboard
			</button>
		</>
  )
}