import { motion } from "framer-motion"
import HealthBar from "./HealthBar"
export default function Character({
  side,
  characterAnimation,
  character,
  characterHealthColor,
  getPassiveDescription,
  calculateExperienceForNextLevel,
}) {
	const togglePassivesExpand = (side) => {
		// Find the container based on the 'side' (player or enemy)
		const container = document.querySelector(`.character-passives-container-${side}`);
		const passivesContainer = container.querySelector('.character-passives');
		const button = container.querySelector('.expand-button');

		if (passivesContainer && button) {
			// Toggle visibility
			const isExpanded = passivesContainer.classList.contains('expanded');
			if (isExpanded) {
				passivesContainer.classList.remove('expanded');
				button.textContent = 'Show';
			} else {
				passivesContainer.classList.add('expanded');
				button.textContent = 'Hide';
			}
		}
	};

	return (
		<>
			<motion.div
				className='character-item'
				initial="idle"
				animate={characterAnimation}
			>
				<img src={character.image || '/CharacterImage/default.png'} alt={character.name} />
				<h2>Player: {character.name}</h2>
				<p>Level: {character.level}</p>
				<HealthBar
					health={character.health}
					maxHealth={character.maxHealth}
					healthColor={characterHealthColor}
					shield={character.shield}
				/>
				<p>Damage: {character.damage}</p>
				<p>SPD: {character.speed}</p>
				<div className={`character-passives-container-${side}`}>
					<p>Passives:</p>
					<div className={`character-passives`}>
						{character.passives.length > 0 ? (
							<div style={{ whiteSpace: 'pre-line' }}>
								{character.passives.map(passive => (
									<p dangerouslySetInnerHTML={{ __html: getPassiveDescription(passive) }} key={passive}></p>
								))}
							</div>
						) : (
							'No passive'
						)}
					</div>
					<button className="expand-button" onClick={() => togglePassivesExpand(side)}>
						Show
					</button>
				</div>

				{/* Display Player's Status Effects */}
				<div className="status-effects">
					{character.status_effects && character.status_effects.length > 0 ? (
						character.status_effects.map((effect, index) => (
							<div key={index} className={`status-effect-item ${effect.type === "Golden" ? "golden-effect" : ""}`}>
								<div className="status-effect-wrapper">
									<img
										src={effect.image || '/StatusEffectImage/default.png'}
										alt={effect.name}
										className="status-effect-image"
										title={effect.description}
									/>
									{(effect.duration !== null || effect.stackCount !== null) && (
										<span className="status-effect-duration">
											{effect.duration ?? effect.stackCount}
										</span>
									)}
								</div>
							</div>
						))
					) : (
						<p></p>
					)}
				</div>
				{side === "player" && (
					<p>Experience: {character.experience}/{calculateExperienceForNextLevel(character.level)}</p>
				)}
			</motion.div>
		</>
	)
}