export interface TeamImport {
  name: string;
  type: "organization";
  aliases: string[];
}

// ---------- NFL (32 teams) ----------

export const NFL_TEAMS: TeamImport[] = [
  // AFC East
  { name: "Buffalo Bills", type: "organization", aliases: ["BUF", "Bills"] },
  { name: "Miami Dolphins", type: "organization", aliases: ["MIA", "Dolphins"] },
  { name: "New England Patriots", type: "organization", aliases: ["NE", "Patriots", "Pats"] },
  { name: "New York Jets", type: "organization", aliases: ["NYJ", "Jets"] },

  // AFC North
  { name: "Baltimore Ravens", type: "organization", aliases: ["BAL", "Ravens"] },
  { name: "Cincinnati Bengals", type: "organization", aliases: ["CIN", "Bengals"] },
  { name: "Cleveland Browns", type: "organization", aliases: ["CLE", "Browns"] },
  { name: "Pittsburgh Steelers", type: "organization", aliases: ["PIT", "Steelers"] },

  // AFC South
  { name: "Houston Texans", type: "organization", aliases: ["HOU", "Texans"] },
  { name: "Indianapolis Colts", type: "organization", aliases: ["IND", "Colts"] },
  { name: "Jacksonville Jaguars", type: "organization", aliases: ["JAX", "Jaguars", "Jags"] },
  { name: "Tennessee Titans", type: "organization", aliases: ["TEN", "Titans"] },

  // AFC West
  { name: "Denver Broncos", type: "organization", aliases: ["DEN", "Broncos"] },
  { name: "Kansas City Chiefs", type: "organization", aliases: ["KC", "Chiefs"] },
  { name: "Las Vegas Raiders", type: "organization", aliases: ["LV", "Raiders"] },
  { name: "Los Angeles Chargers", type: "organization", aliases: ["LAC", "Chargers"] },

  // NFC East
  { name: "Dallas Cowboys", type: "organization", aliases: ["DAL", "Cowboys"] },
  { name: "New York Giants", type: "organization", aliases: ["NYG", "Giants"] },
  { name: "Philadelphia Eagles", type: "organization", aliases: ["PHI", "Eagles"] },
  { name: "Washington Commanders", type: "organization", aliases: ["WSH", "Commanders"] },

  // NFC North
  { name: "Chicago Bears", type: "organization", aliases: ["CHI", "Bears"] },
  { name: "Detroit Lions", type: "organization", aliases: ["DET", "Lions"] },
  { name: "Green Bay Packers", type: "organization", aliases: ["GB", "Packers"] },
  { name: "Minnesota Vikings", type: "organization", aliases: ["MIN", "Vikings"] },

  // NFC South
  { name: "Atlanta Falcons", type: "organization", aliases: ["ATL", "Falcons"] },
  { name: "Carolina Panthers", type: "organization", aliases: ["CAR", "Panthers"] },
  { name: "New Orleans Saints", type: "organization", aliases: ["NO", "Saints"] },
  { name: "Tampa Bay Buccaneers", type: "organization", aliases: ["TB", "Buccaneers", "Bucs"] },

  // NFC West
  { name: "Arizona Cardinals", type: "organization", aliases: ["ARI", "Cardinals"] },
  { name: "Los Angeles Rams", type: "organization", aliases: ["LAR", "Rams"] },
  { name: "San Francisco 49ers", type: "organization", aliases: ["SF", "49ers", "Niners"] },
  { name: "Seattle Seahawks", type: "organization", aliases: ["SEA", "Seahawks", "Hawks"] },
];

// ---------- NBA (30 teams) ----------

export const NBA_TEAMS: TeamImport[] = [
  // Atlantic
  { name: "Boston Celtics", type: "organization", aliases: ["BOS", "Celtics"] },
  { name: "Brooklyn Nets", type: "organization", aliases: ["BKN", "Nets"] },
  { name: "New York Knicks", type: "organization", aliases: ["NYK", "Knicks"] },
  { name: "Philadelphia 76ers", type: "organization", aliases: ["PHI", "76ers", "Sixers"] },
  { name: "Toronto Raptors", type: "organization", aliases: ["TOR", "Raptors"] },

  // Central
  { name: "Chicago Bulls", type: "organization", aliases: ["CHI", "Bulls"] },
  { name: "Cleveland Cavaliers", type: "organization", aliases: ["CLE", "Cavaliers", "Cavs"] },
  { name: "Detroit Pistons", type: "organization", aliases: ["DET", "Pistons"] },
  { name: "Indiana Pacers", type: "organization", aliases: ["IND", "Pacers"] },
  { name: "Milwaukee Bucks", type: "organization", aliases: ["MIL", "Bucks"] },

  // Southeast
  { name: "Atlanta Hawks", type: "organization", aliases: ["ATL", "Hawks"] },
  { name: "Charlotte Hornets", type: "organization", aliases: ["CHA", "Hornets"] },
  { name: "Miami Heat", type: "organization", aliases: ["MIA", "Heat"] },
  { name: "Orlando Magic", type: "organization", aliases: ["ORL", "Magic"] },
  { name: "Washington Wizards", type: "organization", aliases: ["WAS", "Wizards"] },

  // Northwest
  { name: "Denver Nuggets", type: "organization", aliases: ["DEN", "Nuggets"] },
  { name: "Minnesota Timberwolves", type: "organization", aliases: ["MIN", "Timberwolves", "Wolves", "T-Wolves"] },
  { name: "Oklahoma City Thunder", type: "organization", aliases: ["OKC", "Thunder"] },
  { name: "Portland Trail Blazers", type: "organization", aliases: ["POR", "Trail Blazers", "Blazers"] },
  { name: "Utah Jazz", type: "organization", aliases: ["UTA", "Jazz"] },

  // Pacific
  { name: "Golden State Warriors", type: "organization", aliases: ["GSW", "Warriors", "Dubs"] },
  { name: "Los Angeles Clippers", type: "organization", aliases: ["LAC", "Clippers"] },
  { name: "Los Angeles Lakers", type: "organization", aliases: ["LAL", "Lakers"] },
  { name: "Phoenix Suns", type: "organization", aliases: ["PHX", "Suns"] },
  { name: "Sacramento Kings", type: "organization", aliases: ["SAC", "Kings"] },

  // Southwest
  { name: "Dallas Mavericks", type: "organization", aliases: ["DAL", "Mavericks", "Mavs"] },
  { name: "Houston Rockets", type: "organization", aliases: ["HOU", "Rockets"] },
  { name: "Memphis Grizzlies", type: "organization", aliases: ["MEM", "Grizzlies", "Grizz"] },
  { name: "New Orleans Pelicans", type: "organization", aliases: ["NOP", "Pelicans", "Pels"] },
  { name: "San Antonio Spurs", type: "organization", aliases: ["SAS", "Spurs"] },
];

// ---------- MLB (30 teams) ----------

export const MLB_TEAMS: TeamImport[] = [
  // AL East
  { name: "Baltimore Orioles", type: "organization", aliases: ["BAL", "Orioles", "O's"] },
  { name: "Boston Red Sox", type: "organization", aliases: ["BOS", "Red Sox", "Sox"] },
  { name: "New York Yankees", type: "organization", aliases: ["NYY", "Yankees", "Yanks"] },
  { name: "Tampa Bay Rays", type: "organization", aliases: ["TB", "Rays"] },
  { name: "Toronto Blue Jays", type: "organization", aliases: ["TOR", "Blue Jays", "Jays"] },

  // AL Central
  { name: "Chicago White Sox", type: "organization", aliases: ["CWS", "White Sox"] },
  { name: "Cleveland Guardians", type: "organization", aliases: ["CLE", "Guardians"] },
  { name: "Detroit Tigers", type: "organization", aliases: ["DET", "Tigers"] },
  { name: "Kansas City Royals", type: "organization", aliases: ["KC", "Royals"] },
  { name: "Minnesota Twins", type: "organization", aliases: ["MIN", "Twins"] },

  // AL West
  { name: "Houston Astros", type: "organization", aliases: ["HOU", "Astros", "Stros"] },
  { name: "Los Angeles Angels", type: "organization", aliases: ["LAA", "Angels", "Halos"] },
  { name: "Oakland Athletics", type: "organization", aliases: ["OAK", "Athletics", "A's"] },
  { name: "Seattle Mariners", type: "organization", aliases: ["SEA", "Mariners", "M's"] },
  { name: "Texas Rangers", type: "organization", aliases: ["TEX", "Rangers"] },

  // NL East
  { name: "Atlanta Braves", type: "organization", aliases: ["ATL", "Braves"] },
  { name: "Miami Marlins", type: "organization", aliases: ["MIA", "Marlins"] },
  { name: "New York Mets", type: "organization", aliases: ["NYM", "Mets"] },
  { name: "Philadelphia Phillies", type: "organization", aliases: ["PHI", "Phillies"] },
  { name: "Washington Nationals", type: "organization", aliases: ["WSH", "Nationals", "Nats"] },

  // NL Central
  { name: "Chicago Cubs", type: "organization", aliases: ["CHC", "Cubs", "Cubbies"] },
  { name: "Cincinnati Reds", type: "organization", aliases: ["CIN", "Reds"] },
  { name: "Milwaukee Brewers", type: "organization", aliases: ["MIL", "Brewers", "Brew Crew"] },
  { name: "Pittsburgh Pirates", type: "organization", aliases: ["PIT", "Pirates", "Buccos"] },
  { name: "St. Louis Cardinals", type: "organization", aliases: ["STL", "Cardinals", "Cards"] },

  // NL West
  { name: "Arizona Diamondbacks", type: "organization", aliases: ["ARI", "Diamondbacks", "D-backs"] },
  { name: "Colorado Rockies", type: "organization", aliases: ["COL", "Rockies"] },
  { name: "Los Angeles Dodgers", type: "organization", aliases: ["LAD", "Dodgers"] },
  { name: "San Diego Padres", type: "organization", aliases: ["SD", "Padres", "Friars"] },
  { name: "San Francisco Giants", type: "organization", aliases: ["SF", "Giants"] },
];
