import React, { useState} from 'react';
import { activeSkills } from '../activeSkills';
import { passiveDescriptions } from '../charactersFiles/passives';
export default function Shop ({
  money,
  player_characters,
  handlePurchase,
  player_activeSkills,
  selectedSkills,
  player_ownedPassives,
  selectedPassives,
  handleEquipSkill,
  handleUnequipSkill,
  handleEquipPassive,
  handleUnequipPassive,
  setIsShopOpen,
  setIsUserStatsVisible,
}){
const [shopTab, setShopTab] = useState('characters');
const shopItems = [
	{ id: 1, name: "Recruit the Vampire", character_id: 'vampire', cost: 2000 },
	{ id: 2, name: "Recruit the Archer", character_id: 'archer', cost: 3000 },
	{ id: 3, name: "Unlock Heal", skill_id: 'skillHeal', cost: 0 },
	{ id: 4, name: "Unlock Fireball", skill_id: 'skillFireball', cost: 0 },
	{ id: 5, name: "Unlock Poison", skill_id: 'skillPoison', cost: 0 },
	{ id: 6, name: "Unlock Damage Up", skill_id: 'skillDamageUp', cost: 0 },
	{ id: 7, name: "Buy Soul Absorption", passive_name:'Soul Absorption', passive_id: 'passiveSoulAbsorption', requirement: 'Drops from the Necromancer.', cost: 0 },
	{ id: 8, name: "Buy Bulwark", passive_name:'Bulwark', passive_id: 'passiveBulwark', requirement: 'Achieve level 10 on Knight.', cost: 0 },
	{ id: 9, name: "Buy Dual Wield", passive_name:'Dual Wield', passive_id: 'passiveDualWield', requirement: 'Achieve level 10 on Rogue.', cost: 0 },
	{ id: 10, name: "Buy Arcane Infused", passive_name:'Arcane Infused', passive_id: 'passiveArcaneInfused', requirement: 'Achieve level 10 on Mage.', cost: 0 },
	{ id: 11, name: "Buy Life Steal", passive_name:'Life Steal', passive_id: 'passiveLifeSteal', requirement: 'Achieve level 10 on Vampire.', cost: 0 },
	{ id: 12, name: "Buy Poison Tip", passive_name:'Poison Tip', passive_id: 'passivePoisonTip', requirement: 'Achieve level 10 on Archer.', cost: 0 },
];
return (
	<div className="modal" id="shop-modal" onClick={(e) => e.stopPropagation()}>
		<div className="modal-content">
			<h2>Shop</h2>
			<span>Money: {money}$</span>
			{/* Tab Navigation */}
			<div className="tabs">
				<button 
					className={`tab-button ${shopTab === 'characters' ? 'active' : ''}`}
					onClick={() => setShopTab('characters')}
				>
					Characters
				</button>
				<button 
					className={`tab-button ${shopTab === 'passives' ? 'active' : ''}`}
					onClick={() => setShopTab('passives')}
				>
					Passives
				</button>
				<button 
					className={`tab-button ${shopTab === 'skills' ? 'active' : ''}`}
					onClick={() => setShopTab('skills')}
				>
					Skills
				</button>
			</div>

			{/* Tab Content */}
			{shopTab === 'characters' && (
				<>
				<span>You can recruit characters here</span>
				<ul style={{ paddingLeft: 5 }}>
					{shopItems
						.filter((item) => item.character_id) // Filter for character shop items
						.map((item) => {
							const character = player_characters[item.character_id];
							const isOwned = character?.isUnlocked;
							const canAfford = money >= item.cost;

							return (
								<div
									key={item.id}
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										width: '100%',
									}}
								>
									<span style={{ textAlign: 'left' }}>
										{item.name} - {item.cost}$
									</span>
									<button
										onClick={() => handlePurchase(item)}
										disabled={!canAfford || isOwned}
										style={{
											cursor: canAfford && !isOwned ? 'pointer' : 'not-allowed',
											backgroundColor: isOwned ? '#ccc' : canAfford ? '#28a745' : '#ff6666',
											color: '#fff',
											border: 'none',
											borderRadius: '4px',
											padding: '5px 10px',
										}}
									>
										{isOwned ? 'Owned' : canAfford ? 'Buy' : "Can't afford"}
									</button>
								</div>
							);
						})}
				</ul>
				</>
			)}

			{shopTab === 'skills' && (
				<>
				<span>Purchase skills and equip up to 3 for use in battle!</span>
				<ul style={{ paddingLeft: 5 }}>
					{shopItems
						.filter((item) => item.skill_id) // Filter for skill items only
						.map((item) => {
							const skill = activeSkills.find(s => s.id === item.skill_id);
							if (!skill) return null;

							// Get the cost of the skill from the shop item
							const cost = item.cost;
							const isUnlocked = player_activeSkills[item.skill_id]?.isUnlocked;
							const isEquipped = selectedSkills.includes(item.skill_id);

							return (
								<div
									key={item.id}
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										width: '100%',
									}}
								>
									<span>{skill.name} - {cost}$ | Effect: {skill.description} (Cooldown: {skill.cooldown}s) </span>

									{!isUnlocked ? (
										// If skill is not unlocked, show it as a shop item
										<button
											onClick={() => handlePurchase(item)} // Use existing handlePurchase
											disabled={money < cost} // Disable if not enough money
											style={{
												cursor: money >= cost ? 'pointer' : 'not-allowed',
												backgroundColor: money >= cost ? '#28a745' : '#ff6666',
												color: '#fff',
												border: 'none',
												borderRadius: '4px',
												padding: '5px 10px',
											}}
										>
											{money >= cost ? 'Buy' : "Can't afford"}
										</button>
									) : (
										// If skill is unlocked, show it as an equip button
										<button
											onClick={() => {
												isEquipped ? handleUnequipSkill(item.skill_id) : handleEquipSkill(item.skill_id);
											}}
											style={{
												cursor: 'pointer',
												backgroundColor: isEquipped ? '#007bff' : '#28a745',
												color: '#fff',
												border: 'none',
												borderRadius: '4px',
												padding: '5px 10px',
											}}
										>
											{isEquipped ? 'Unequip' : 'Equip'}
										</button>
									)}
								</div>
							);
						})}
				</ul>
				</>
			)}

			{shopTab === 'passives' && (
				<>
				<span>Hover over to view obtainment method, equip up to 3 to apply for all your characters!</span>
				<ul style={{ paddingLeft: 5 }}>
					{shopItems
						.filter((item) => item.passive_name)
						.map((item) => {
							const passive = passiveDescriptions.find(p => p.name === item.passive_name);
							if (!passive) return null;

							// Get the cost of the passive from the shop item
							const cost = item.cost;
							const isUnlocked = player_ownedPassives[item.passive_id]?.isUnlocked;
							const isObtained = player_ownedPassives[item.passive_id]?.isObtained;
							const isEquipped = selectedPassives.some(passive => passive.name === item.passive_name);

							return (
								<div
									key={item.id}
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										width: '100%',
									}}
								>
									<span 
										style={{ cursor: 'help', textDecoration: 'underline', position: 'relative' }}
										title={`Requirement: ${item.requirement}\nEffect: ${passive.description}`}
									>
										{passive.name} - {item.cost}$
									</span>
									{!isObtained ? (
										<button
											disabled
											style={{
												cursor: 'not-allowed',
												backgroundColor: '#ccc',
												color: '#666',
												border: 'none',
												borderRadius: '4px',
												padding: '5px 10px',
											}}
										>
											Locked
										</button>
									) : (
										!isUnlocked ? (
											<button
												onClick={() => handlePurchase(item)}
												disabled={money < cost}
												style={{
													cursor: money >= cost ? 'pointer' : 'not-allowed',
													backgroundColor: money >= cost ? '#28a745' : '#ff6666',
													color: '#fff',
													border: 'none',
													borderRadius: '4px',
													padding: '5px 10px',
												}}
											>
												{money >= cost ? 'Buy' : "Can't afford"}
											</button>
										) : (
											<button
												onClick={() => {
													isEquipped ? handleUnequipPassive(item.passive_id) : handleEquipPassive(item.passive_name, item.passive_id);
												}}
												style={{
													cursor: 'pointer',
													backgroundColor: isEquipped ? '#007bff' : '#28a745',
													color: '#fff',
													border: 'none',
													borderRadius: '4px',
													padding: '5px 10px',
												}}
											>
												{isEquipped ? 'Unequip' : 'Equip'}
											</button>
										)
									)}
								</div>
							);
						})}
				</ul>
				</>
			)}
			<button id={"close-button"} onClick={() => {setIsShopOpen(false); setIsUserStatsVisible(true)}}>Close</button>
		</div>
	</div>
)
}