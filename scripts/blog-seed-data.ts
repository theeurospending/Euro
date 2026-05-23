// Single source of truth for the explainer / guide / analysis articles.
//
// Consumed only by scripts/generate-blog-seed.ts, which emits:
//   - supabase/migrations/024_blog_explainers_seed.sql   (run in Supabase)
//   - src/lib/blog/metric-explainers.ts                  (metricKey -> {slug,title})
//
// Voice: evidence-led and restrained. Explain the concept in plain English,
// say where the number comes from (Eurostat / ECB / IMF), and note why it
// matters. Where a metric naturally speaks to purchasing power, money-supply
// growth, or the EU's growth gap, say so plainly and let the data carry it —
// no invented figures. Numbers live in the live dataset, not in prose.

export type SeedArticle = {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  metricKeys?: string[]; // metrics whose info box should link here
  body: string;          // HTML (Tiptap-compatible)
};

// Small helpers to keep bodies readable.
const p = (s: string) => `<p>${s}</p>`;
const h = (s: string) => `<h2>${s}</h2>`;
const ul = (items: string[]) => `<ul>${items.map((i) => `<li><p>${i}</p></li>`).join('')}</ul>`;
const note = (s: string) => `<blockquote><p>${s}</p></blockquote>`;

export const ARTICLES: SeedArticle[] = [
  // ----------------------------------------------------------------- GUIDES
  {
    slug: 'start-here',
    title: 'Start here: how to use Eurospending',
    excerpt: 'A two-minute tour of the site — the map, country pages, the comparison tool, the euro timeline, and the data downloads.',
    tags: ['guide', 'start-here'],
    body: [
      p('Eurospending tracks the public finances of the EU and the story of the euro, using only official figures from Eurostat, the European Central Bank (ECB) and the International Monetary Fund (IMF). Here is how the site is laid out.'),
      h('The map and country rankings'),
      p('The home page shows a map of Europe coloured by a chosen metric, and below it a sortable list of every country. Pick a metric to re-rank the list and see who is doing well and who is under strain.'),
      h('Country pages'),
      p('Each country has its own page with a snapshot of headline numbers and charts going back years — debt, deficit, growth, inflation, unemployment and more.'),
      h('Compare'),
      p('The comparison tool puts several countries on one chart for a single metric, so you can see divergence over time.'),
      h('The euro'),
      p('The euro page follows monetary policy and the currency itself: ECB interest rates, the central-bank balance sheet, money supply, exchange rates and inflation.'),
      h('Data and blog'),
      p('Every series can be downloaded from the data page. Throughout the site you will see small information links next to each metric — they bring you to the plain-English explainer for that number, all collected here in the blog.'),
    ].join(''),
  },
  {
    slug: 'glossary',
    title: 'A plain-English glossary of economic terms',
    excerpt: 'Percent of GDP, basis points, real vs nominal, year-on-year, HICP, the Maastricht criteria — the jargon you meet on this site, defined simply.',
    tags: ['guide', 'glossary'],
    body: [
      p('Economic data comes wrapped in shorthand. Here are the terms you will meet most often on Eurospending.'),
      ul([
        '<strong>% of GDP</strong> — a number measured against the size of the whole economy. Expressing debt or spending this way lets you compare a small country with a large one fairly.',
        '<strong>Nominal vs real</strong> — nominal figures are in the prices of the day; real figures strip out inflation so you can compare across time. Real growth is the one that tells you whether the economy actually got bigger.',
        '<strong>Year-on-year (YoY)</strong> — change compared with the same period twelve months earlier. <strong>Quarter-on-quarter (QoQ)</strong> compares with the previous quarter.',
        '<strong>Basis point</strong> — one hundredth of a percentage point. A rate moving from 2.00% to 2.25% rose 25 basis points.',
        '<strong>HICP</strong> — the Harmonised Index of Consumer Prices, the EU\'s standard measure of inflation, built so member states are measured the same way.',
        '<strong>Core inflation</strong> — inflation with volatile food and energy stripped out, used to read the underlying trend.',
        '<strong>The Maastricht criteria</strong> — the EU\'s fiscal rulebook: government deficit below 3% of GDP and debt below 60% of GDP.',
        '<strong>Eurozone vs EU</strong> — the EU is 27 member states; the eurozone is the subset that uses the euro.',
      ]),
    ].join(''),
  },
  {
    slug: 'benchmarks-and-thresholds',
    title: 'What counts as healthy? Key benchmarks and thresholds',
    excerpt: 'The reference lines that turn a raw number into a judgement — the 3% deficit and 60% debt limits, the ECB\'s 2% inflation target, and more.',
    tags: ['guide'],
    metricKeys: [],
    body: [
      p('A number on its own rarely tells you whether a country is doing well. These widely used reference points give the figures meaning.'),
      h('Fiscal: the Maastricht limits'),
      ul([
        '<strong>Deficit under 3% of GDP.</strong> Above this, a government is borrowing heavily relative to the economy.',
        '<strong>Debt under 60% of GDP.</strong> Many EU states sit well above this; the level at which debt becomes a worry depends on growth and borrowing costs.',
      ]),
      h('Prices: the ECB target'),
      p('The ECB aims for inflation of <strong>2%</strong> over the medium term. Persistently above 2% erodes the purchasing power of savings and wages; well below can signal a weak economy.'),
      h('Labour'),
      p('There is no official line for unemployment, but rates in the low single digits are generally considered healthy, while double digits indicate slack and hardship.'),
      note('On the rankings, treat these thresholds as a traffic light: comfortably inside the limit is reassuring, near it is worth watching, beyond it is a strain.'),
    ].join(''),
  },
  {
    slug: 'eurozone-vs-eu',
    title: 'Eurozone vs EU: what\'s the difference?',
    excerpt: 'Why some figures cover 27 countries and others only the 20 that share the euro — and why it matters for reading monetary data.',
    tags: ['guide'],
    body: [
      p('Two groups of countries appear across this site, and mixing them up leads to confusion.'),
      h('The European Union'),
      p('The EU is a political and economic union of 27 member states. Fiscal data — spending, revenue, deficits, debt — is reported for all of them, plus an EU-wide aggregate.'),
      h('The eurozone'),
      p('The eurozone is the subset of EU members that have adopted the euro as their currency. Monetary policy — interest rates, money supply, the central-bank balance sheet — is set by the ECB for the eurozone as a whole, not for each country.'),
      p('So when you see an interest rate or a money-supply figure, it is a single number for the whole currency area. When you see debt or unemployment, it is country by country. Non-euro EU members (and some non-EU European countries) keep their own currencies and their own central banks.'),
    ].join(''),
  },
  {
    slug: 'how-we-source-data',
    title: 'Where our data comes from and how we check it',
    excerpt: 'Only official sources — Eurostat, the ECB and the IMF — pulled by deterministic code, validated before publication, never estimated by us.',
    tags: ['guide', 'methodology'],
    body: [
      p('Trust in the numbers is the whole point of this site, so the sourcing rules are strict.'),
      h('Official sources only'),
      ul([
        '<strong>Eurostat</strong> — the EU\'s statistical office: public finances, GDP, inflation, unemployment, population and housing.',
        '<strong>ECB</strong> — interest rates, the Eurosystem balance sheet, money supply, exchange rates and bond yields.',
        '<strong>IMF</strong> — the World Economic Outlook, used for cross-country forecasts.',
      ]),
      h('How it is collected'),
      p('Data is fetched by deterministic code that reads the published series directly. We never use AI or estimation to fill in an economic figure — every value traces back to an official release. Numbers are validated before they are stored, and obvious anomalies are flagged rather than published.'),
      h('Revisions'),
      p('Official statistics are revised as more information arrives. When a source updates a past value, the site updates with it, so what you see reflects the latest official position.'),
    ].join(''),
  },

  // --------------------------------------------------------------- ANALYSIS
  {
    slug: 'currency-debasement-explained',
    title: 'Currency debasement, explained',
    excerpt: 'Why the euro in your pocket buys less each year, how money-supply growth and inflation connect, and where to watch it in the data.',
    tags: ['analysis'],
    body: [
      p('"Debasement" once meant mixing cheap metal into gold coins. The modern version is quieter: the supply of money grows faster than the goods and services it can buy, and each unit buys a little less over time.'),
      h('How to see it'),
      ul([
        '<strong>Accumulated inflation.</strong> A single year of 2-3% inflation sounds small, but it compounds. Year after year it adds up to a large fall in what a euro buys — the euro page shows the cumulative figure, not just the annual rate.',
        '<strong>Money supply.</strong> The broad money measure, M3, tends to grow steadily and at times sharply. When money grows much faster than the real economy, prices tend to follow.',
        '<strong>The ECB balance sheet.</strong> Large-scale asset purchases expanded the central bank\'s balance sheet enormously after 2015 and again in 2020.',
      ]),
      h('Why it matters'),
      p('Savers and wage earners hold their wealth in euros. If prices rise faster than wages and interest, real purchasing power falls — even when the headline economy looks stable. This is not a forecast; it is arithmetic you can read directly from the inflation, money-supply and exchange-rate series on this site.'),
      note('The figures here are official ECB and Eurostat data. We present them and let you draw conclusions.'),
    ].join(''),
  },
  {
    slug: 'eu-vs-us-china-growth-gap',
    title: 'The growth gap: how the EU compares with the US and China',
    excerpt: 'Real growth and income per head have pulled apart between the EU, the United States and the fast-growing economies of Asia. What the data shows.',
    tags: ['analysis'],
    body: [
      p('For two decades the EU has grown more slowly than the United States and far more slowly than China and India. The gap shows up in a few places.'),
      ul([
        '<strong>Real GDP growth.</strong> Year after year, US growth has tended to outpace the eurozone\'s, and emerging Asia has grown faster still.',
        '<strong>GDP per capita.</strong> Income per head is the cleanest measure of prosperity. The gap between the average American and the average EU citizen has widened over time.',
        '<strong>Compounding.</strong> A persistent one- or two-point difference in annual growth becomes an enormous difference in living standards over a generation.',
      ]),
      h('The caveats'),
      p('Cross-country comparison is harder than it looks: exchange rates, price levels and how output is measured all affect the picture, and the EU scores well on other measures such as inequality and life expectancy. The region-comparison charts on the euro page use IMF data on a consistent basis so the trend is read fairly.'),
    ].join(''),
  },
  {
    slug: 'tax-spend-and-growth',
    title: 'Tax, spend, and growth in the EU',
    excerpt: 'Government revenue and spending are large shares of EU economies. The open question is what that buys in growth — and the data lets you look.',
    tags: ['analysis'],
    body: [
      p('European governments take and spend a large share of national income — generally larger than in the United States. Whether that delivers value is one of the central debates in EU economics, and this site gives you the raw material to weigh it.'),
      ul([
        '<strong>Revenue and spending as a share of GDP.</strong> Both run high across most member states, with social protection the single largest spending function.',
        '<strong>Deficits.</strong> When spending outruns revenue, the gap is borrowed, adding to debt.',
        '<strong>Growth.</strong> Set these against real GDP growth and GDP per capita and ask the obvious question: is the spending translating into a faster-growing, more prosperous economy?',
      ]),
      p('We take no view for you. The spending, revenue, deficit and growth series are all here, country by country, so you can judge.'),
    ].join(''),
  },

  // ------------------------------------------------------ METRIC EXPLAINERS
  {
    slug: 'government-spending',
    title: 'Government spending (total expenditure)',
    excerpt: 'What total general government expenditure as a share of GDP measures, and how to read it.',
    tags: ['explainer', 'fiscal'],
    metricKeys: ['gov_expenditure_total_pct_gdp'],
    body: [
      p('Total general government expenditure is everything the state spends — central government, regional and local government, and social-security funds combined. It is shown as a percentage of GDP so countries of different sizes can be compared.'),
      h('Why a share of GDP'),
      p('Expressing spending against the size of the economy answers the real question: how big is the state relative to everything the country produces? In most EU members this sits around or above 45-50% of GDP, high by global standards.'),
      h('What to watch'),
      ul([
        'Spending that rises faster than revenue produces deficits and, over time, debt.',
        'The composition matters as much as the level — see the breakdown by function.',
        'Set spending against real growth to ask whether a larger state is buying a faster economy.',
      ]),
      p('Source: Eurostat (general government, sector S13), annual.'),
    ].join(''),
  },
  {
    slug: 'government-spending-by-function',
    title: 'Government spending by function: health, education, defence, social protection',
    excerpt: 'How the COFOG breakdown splits public spending into what governments actually spend it on.',
    tags: ['explainer', 'fiscal'],
    metricKeys: ['gov_expenditure_health_pct_gdp', 'gov_expenditure_education_pct_gdp', 'gov_expenditure_defence_pct_gdp', 'gov_expenditure_social_protection_pct_gdp'],
    body: [
      p('Total spending tells you how big the state is; the functional breakdown tells you what it does. Eurostat classifies expenditure using an international standard called COFOG (Classification of the Functions of Government).'),
      ul([
        '<strong>Social protection</strong> — pensions, unemployment benefits, family support. Almost always the largest single function in EU budgets.',
        '<strong>Health</strong> — public healthcare systems and related services.',
        '<strong>Education</strong> — schools and universities.',
        '<strong>Defence</strong> — armed forces and military procurement, historically low across much of the EU.',
      ]),
      h('How to read it'),
      p('Each is shown as a percentage of GDP. Comparing the mix across countries reveals very different priorities — and comparing it over time shows where the long-run pressures, especially ageing-related social protection and health, are building.'),
      p('Source: Eurostat COFOG, annual.'),
    ].join(''),
  },
  {
    slug: 'government-revenue',
    title: 'Government revenue',
    excerpt: 'Total general government revenue as a share of GDP — essentially the overall tax-and-contributions take.',
    tags: ['explainer', 'fiscal'],
    metricKeys: ['gov_revenue_total_pct_gdp'],
    body: [
      p('Total general government revenue is everything the state collects: taxes on income and profits, VAT and other taxes on goods, social contributions, and assorted other income. It is shown as a percentage of GDP.'),
      h('What it tells you'),
      p('This is the broadest measure of the tax burden. A high revenue-to-GDP ratio means a large share of national income passes through the state. EU members generally sit at the high end internationally, reflecting extensive welfare and public-service systems.'),
      h('Reading it well'),
      ul([
        'Compare revenue with expenditure: the gap is the deficit or surplus.',
        'A rising ratio can reflect higher tax rates, a larger tax base, or a shrinking private economy — the cause matters.',
      ]),
      p('Source: Eurostat (general government, sector S13), annual.'),
    ].join(''),
  },
  {
    slug: 'deficit-and-surplus',
    title: 'Deficit and surplus (net lending/borrowing)',
    excerpt: 'The gap between what a government raises and what it spends in a year, and the 3%-of-GDP Maastricht limit.',
    tags: ['explainer', 'fiscal'],
    metricKeys: ['gov_deficit_pct_gdp'],
    body: [
      p('The budget balance — formally net lending (+) or net borrowing (−), item B.9 — is revenue minus spending in a single year. A negative figure is a deficit (the government borrowed to cover the gap); a positive figure is a surplus.'),
      h('The 3% rule'),
      p('The EU\'s Maastricht framework asks members to keep their deficit below <strong>3% of GDP</strong>. Breaching it can trigger the Excessive Deficit Procedure. The limit was suspended during the pandemic and has since been reformed, but 3% remains the reference line.'),
      h('Why it matters'),
      p('Deficits are how debt accumulates. A one-off deficit in a downturn is normal and often sensible; persistent deficits in good times push the debt ratio up and leave less room to respond to the next crisis.'),
      p('Source: Eurostat, Excessive Deficit Procedure / sector S13, annual.'),
    ].join(''),
  },
  {
    slug: 'government-debt',
    title: 'Government debt',
    excerpt: 'Gross general government debt — the accumulated stock of borrowing — shown both as a share of GDP and in euros, with the 60% limit.',
    tags: ['explainer', 'debt'],
    metricKeys: ['gov_debt_pct_gdp', 'gov_debt_eur_millions'],
    body: [
      p('Government debt is the total stock of what the state owes, built up from years of deficits. We show it two ways: as a percentage of GDP (best for comparing countries) and in absolute euro millions (the headline size).'),
      h('The 60% reference'),
      p('Maastricht set a reference of debt below <strong>60% of GDP</strong>. Many EU members are far above it; a few carry debt above 100% or even 150%.'),
      h('When is debt a problem?'),
      ul([
        'It depends on the interest rate versus the growth rate: if the economy grows faster than the cost of borrowing, debt can be carried more easily.',
        'High debt narrows a government\'s room for manoeuvre and exposes it to rising bond yields.',
        'The trend matters more than any single year — is the ratio drifting up or coming down?',
      ]),
      p('Source: Eurostat, Maastricht consolidated gross debt, annual.'),
    ].join(''),
  },
  {
    slug: 'gdp-and-real-growth',
    title: 'GDP and real growth',
    excerpt: 'The size of the economy in euros, and how fast it is actually growing once inflation is removed.',
    tags: ['explainer', 'growth'],
    metricKeys: ['gdp_nominal_eur_millions', 'gdp_real_growth_pct', 'gdp_real_growth_qoq_pct'],
    body: [
      p('Gross Domestic Product (GDP) is the total value of everything an economy produces. We show two related things.'),
      ul([
        '<strong>Nominal GDP</strong> (EUR millions) — the headline size of the economy in today\'s prices.',
        '<strong>Real growth</strong> (% year-on-year, and quarter-on-quarter) — how much the economy grew after stripping out inflation. This is the figure that tells you whether the country is genuinely getting richer.',
      ]),
      h('Why real, not nominal'),
      p('Nominal GDP can rise simply because prices rose. Real growth removes that effect, so a positive number means more actual output. Two consecutive quarters of negative real growth is the common rule-of-thumb definition of a recession.'),
      h('The bigger picture'),
      p('EU real growth has tended to run slower than the United States for two decades. Comparing the growth series across regions is the heart of the "is the EU falling behind?" question.'),
      p('Source: Eurostat national accounts (annual and quarterly).'),
    ].join(''),
  },
  {
    slug: 'gdp-per-capita',
    title: 'GDP per capita',
    excerpt: 'Economic output divided by population — the simplest single gauge of average prosperity.',
    tags: ['explainer', 'growth'],
    metricKeys: ['gdp_per_capita_eur'],
    body: [
      p('GDP per capita is the economy\'s output divided by its population, in euros per inhabitant. It is the most widely used shorthand for how prosperous a country is on average.'),
      h('What it captures — and misses'),
      ul([
        'It captures average income generated per person, which tracks living standards reasonably well.',
        'It is an average, so it says nothing about how income is distributed.',
        'Comparing across currencies and price levels requires care; within the euro area the comparison is cleaner.',
      ]),
      h('The comparison that matters'),
      p('GDP per capita is where the EU\'s growth gap with the United States is most visible: the difference in income per head has widened over the past two decades. It is the number to watch when asking whether Europe is keeping pace.'),
      p('Source: Eurostat national accounts, annual, current prices.'),
    ].join(''),
  },
  {
    slug: 'unemployment',
    title: 'Unemployment rate',
    excerpt: 'The share of people who want work and cannot find it — the headline gauge of labour-market health.',
    tags: ['explainer', 'labour'],
    metricKeys: ['unemployment_rate_pct', 'unemployment_monthly_pct'],
    body: [
      p('The unemployment rate is the number of people without a job who are actively looking, as a percentage of the labour force (those working or looking, aged 15-74). We show both the annual average and the more timely monthly series.'),
      h('How to read it'),
      ul([
        'Low single digits generally indicate a healthy labour market; double digits signal serious slack and hardship.',
        'It is a lagging indicator — it tends to keep rising for a while after a downturn ends.',
        'It excludes people who have given up looking, so it can understate weakness.',
      ]),
      h('Wide divergence'),
      p('Unemployment varies enormously across the EU, and youth unemployment in particular has run very high in parts of southern Europe. The monthly series is the best early read on the labour market between annual updates.'),
      p('Source: Eurostat labour force survey (annual and monthly).'),
    ].join(''),
  },
  {
    slug: 'population',
    title: 'Population',
    excerpt: 'Total population on 1 January — the denominator behind per-capita figures and a slow-moving driver of everything else.',
    tags: ['explainer', 'demographics'],
    metricKeys: ['population_total'],
    body: [
      p('Population is the total number of people resident in a country on 1 January each year. It looks like a simple count, but it underpins a great deal.'),
      h('Why it matters'),
      ul([
        'It is the denominator for per-capita measures — GDP per capita, money supply per person, debt per head.',
        'An ageing, slow-growing population raises pension and health spending while shrinking the working-age base that funds it.',
        'Most EU population change now comes from migration rather than natural increase (births minus deaths), which has turned negative in many member states.',
      ]),
      p('Source: Eurostat demographics, population on 1 January, annual.'),
    ].join(''),
  },
  {
    slug: 'inflation-hicp',
    title: 'Inflation (HICP)',
    excerpt: 'The Harmonised Index of Consumer Prices — the EU\'s standard measure of how fast the cost of living is rising.',
    tags: ['explainer', 'inflation'],
    metricKeys: ['hicp_annual_pct', 'hicp_monthly_pct', 'eurozone_hicp_headline'],
    body: [
      p('The Harmonised Index of Consumer Prices (HICP) measures the average change in the prices households pay for a representative basket of goods and services. It is "harmonised" so every EU country is measured the same way and the figures are comparable.'),
      h('Annual, monthly, headline'),
      ul([
        'The <strong>annual</strong> rate compares prices with twelve months earlier — the standard "inflation is X%" figure.',
        'The <strong>monthly</strong> series gives a more timely read between annual updates.',
        'The <strong>eurozone headline</strong> rate is the single figure the ECB targets.',
      ]),
      h('Why it matters'),
      p('The ECB aims for 2% over the medium term. Inflation above that erodes the purchasing power of wages and savings; the effect compounds, so several years of moderate inflation add up to a large fall in what a euro buys. See the accumulated-inflation view on the euro page.'),
      p('Source: Eurostat and ECB (HICP).'),
    ].join(''),
  },
  {
    slug: 'core-inflation',
    title: 'Core inflation',
    excerpt: 'Inflation with volatile food and energy stripped out, used to read the underlying price trend.',
    tags: ['explainer', 'inflation'],
    metricKeys: ['hicp_core_annual_pct', 'eurozone_hicp_core'],
    body: [
      p('Core inflation is the HICP with the most volatile components — energy, food, alcohol and tobacco — removed. The aim is to see the underlying trend without the noise of swinging oil and food prices.'),
      h('Why look at core'),
      ul([
        'Headline inflation can spike or drop sharply on energy prices alone, which can mislead about the underlying picture.',
        'Core moves more slowly and is a better guide to whether inflation is becoming embedded in wages and services.',
        'Central banks watch core closely when deciding whether a burst of inflation is temporary or persistent.',
      ]),
      p('When headline inflation falls but core stays high, it usually means the original shock has faded but price pressure has spread through the wider economy.'),
      p('Source: Eurostat and ECB (HICP excluding energy, food, alcohol and tobacco).'),
    ].join(''),
  },
  {
    slug: 'ecb-policy-rates',
    title: 'ECB policy interest rates',
    excerpt: 'The three rates the European Central Bank sets to steer the cost of money across the eurozone.',
    tags: ['explainer', 'monetary'],
    metricKeys: ['ecb_main_refi_rate', 'ecb_deposit_facility_rate', 'ecb_marginal_lending_rate'],
    body: [
      p('The ECB sets the price of money for the whole eurozone through three official rates. Together they form a corridor that steers the rates banks charge each other, and ultimately what households and firms pay.'),
      ul([
        '<strong>Main refinancing rate</strong> — the headline policy rate, the cost of the ECB\'s regular lending to banks.',
        '<strong>Deposit facility rate</strong> — what banks earn for parking spare cash at the ECB overnight. Since the era of abundant reserves this has become the rate that matters most for market rates.',
        '<strong>Marginal lending rate</strong> — the ceiling: the cost of borrowing from the ECB overnight.',
      ]),
      h('Why they move'),
      p('The ECB raises rates to cool inflation and cuts them to support a weak economy. Rates were negative or near zero for much of the 2010s, then rose sharply from 2022 to fight the inflation surge. These are eurozone-wide — one setting for twenty countries.'),
      p('Source: ECB.'),
    ].join(''),
  },
  {
    slug: 'ecb-balance-sheet',
    title: 'The Eurosystem balance sheet',
    excerpt: 'The total assets held by the ECB and national central banks — a direct read on how much money the central bank has created.',
    tags: ['explainer', 'monetary'],
    metricKeys: ['ecb_balance_sheet_total'],
    body: [
      p('The Eurosystem balance sheet is the combined total assets of the ECB and the national central banks of the eurozone. When the central bank buys bonds or lends to banks, it creates new central-bank money and its balance sheet grows.'),
      h('Why it ballooned'),
      p('Through quantitative easing (large-scale asset purchases) from 2015, and again massively during the pandemic from 2020, the balance sheet expanded to a size unimaginable in the euro\'s early years. From 2022 the ECB began shrinking it again ("quantitative tightening").'),
      h('Why it matters'),
      ul([
        'It is the clearest single gauge of how much money the central bank has injected.',
        'Rapid expansion is closely tied to the money-supply growth and asset-price moves discussed in our debasement explainer.',
        'Unwinding it removes liquidity and can push up bond yields.',
      ]),
      p('Source: ECB, weekly consolidated financial statement.'),
    ].join(''),
  },
  {
    slug: 'money-supply',
    title: 'Money supply (M1, M2, M3)',
    excerpt: 'How much money exists in the eurozone, from cash and current accounts up to the broad measure the ECB tracks.',
    tags: ['explainer', 'monetary'],
    metricKeys: ['m1_eurozone', 'm2_eurozone', 'm3_eurozone'],
    body: [
      p('"Money supply" is the total stock of money in the economy. It comes in nested measures, from narrow to broad.'),
      ul([
        '<strong>M1</strong> — the most liquid money: cash in circulation plus overnight deposits (current accounts).',
        '<strong>M2</strong> — M1 plus deposits with a short maturity or notice period.',
        '<strong>M3</strong> — the broad measure the ECB watches: M2 plus repos, money-market fund shares and short-term debt securities.',
      ]),
      h('Why it matters'),
      p('Over the long run, when the money supply grows much faster than the real economy, prices tend to rise — money loses value. M3 growth is therefore a key signal behind inflation and currency debasement. Dividing money supply by population gives money per person, a useful way to see the trend free of compounding totals.'),
      p('Source: ECB monetary aggregates (eurozone), monthly.'),
    ].join(''),
  },
  {
    slug: 'exchange-rates',
    title: 'Exchange rates (EUR/USD, EUR/GBP)',
    excerpt: 'What one euro buys in dollars and pounds — the external value of the currency.',
    tags: ['explainer', 'monetary'],
    metricKeys: ['eur_usd_rate', 'eur_gbp_rate'],
    body: [
      p('An exchange rate is the price of one currency in terms of another. EUR/USD is how many US dollars one euro buys; EUR/GBP is how many pounds. These are the ECB\'s daily reference rates.'),
      h('What moves them'),
      ul([
        'Interest-rate differences — money tends to flow toward higher-yielding currencies.',
        'Relative growth and inflation prospects.',
        'Risk sentiment — in turmoil the dollar often strengthens as a safe haven.',
      ]),
      h('Internal vs external value'),
      p('Inflation measures the euro\'s <em>internal</em> value (what it buys at home); the exchange rate is its <em>external</em> value (what it buys abroad). A currency can hold up against peers while still losing purchasing power at home if those peers are inflating too. Both views matter when judging the health of the euro.'),
      p('Source: ECB reference exchange rates, daily.'),
    ].join(''),
  },
  {
    slug: 'bond-yields',
    title: 'Government bond yields (10-year)',
    excerpt: 'The interest rate governments pay to borrow for ten years — and what the spread between countries reveals.',
    tags: ['explainer', 'monetary'],
    metricKeys: ['sovereign_10y_yield', 'sovereign_10y_yield_local', 'bund_10y_yield'],
    body: [
      p('A government bond yield is the annual return an investor earns for lending to a government for a given term. The 10-year yield is the standard benchmark for long-term borrowing costs.'),
      ul([
        '<strong>German Bund (10Y)</strong> — the eurozone\'s safe-asset benchmark; other countries are judged against it.',
        '<strong>Sovereign 10Y yields</strong> — the equivalent for individual countries, in euros.',
        '<strong>Local-currency yields</strong> — for EU members outside the euro, in their own currency.',
      ]),
      h('Spreads tell the story'),
      p('The gap ("spread") between a country\'s yield and the Bund reflects the extra risk investors demand. Widening spreads — as in the 2010-2012 sovereign debt crisis — signal stress; narrow spreads signal confidence. Yields also set the cost of carrying government debt, which is why they matter so much for highly indebted states.'),
      p('Source: ECB / national benchmarks, daily.'),
    ].join(''),
  },
  {
    slug: 'housing-cost-burden',
    title: 'Housing cost burden',
    excerpt: 'The share of people spending more than 40% of their income on housing — a direct measure of affordability stress.',
    tags: ['explainer', 'housing'],
    metricKeys: ['housing_cost_overburden_pct'],
    body: [
      p('The housing cost overburden rate is the share of the population living in households that spend more than <strong>40% of disposable income</strong> on housing — rent or mortgage, plus utilities and upkeep. It is a direct gauge of how many people are squeezed by housing costs.'),
      h('Why it matters'),
      ul([
        'Housing is the largest cost in most household budgets, so overburden is a strong signal of financial stress.',
        'It captures something headline inflation can miss — a cost-of-living problem concentrated in shelter.',
        'Rates vary widely across the EU and tend to be worst for renters and lower-income households.',
      ]),
      p('Watching this alongside inflation gives a fuller picture of real living standards than prices alone.'),
      p('Source: Eurostat, EU Statistics on Income and Living Conditions (ilc_lvho07a), annual.'),
    ].join(''),
  },
  {
    slug: 'euro-vs-gold-and-bitcoin',
    title: 'The euro priced in gold and Bitcoin',
    excerpt: 'Why we track the euro against scarce assets, and what a rising gold or Bitcoin price really says about the currency.',
    tags: ['explainer', 'monetary'],
    metricKeys: ['gold_eur', 'btc_eur'],
    body: [
      p('Inflation measures the euro against a basket of everyday goods. Pricing it against scarce assets — gold, with thousands of years as money, and Bitcoin, with a fixed supply of 21 million — gives a complementary view of the currency\'s value.'),
      ul([
        '<strong>Gold (EUR per troy ounce)</strong> — the classic store of value. A rising euro price of gold means each euro commands less of it.',
        '<strong>Bitcoin (EUR)</strong> — a fixed-supply digital asset, far more volatile, but a stark benchmark for a currency whose supply keeps growing.',
      ]),
      h('How to read these charts'),
      p('When the euro price of gold or Bitcoin rises, it is partly the asset moving and partly the euro losing ground. Neither is a like-for-like inflation measure — both are volatile and driven by their own demand — but a long, persistent climb is hard to separate from a currency that is being steadily diluted.'),
      note('Prices are euro-denominated daily closes from a public market source, not an official EU statistic. We show them as context for the debasement story, not as a forecast.'),
    ].join(''),
  },
  {
    slug: 'migration-and-population-change',
    title: 'Net migration and population change',
    excerpt: 'Why most EU population change now comes from migration rather than births, and how the crude rates are measured.',
    tags: ['explainer', 'demographics'],
    metricKeys: ['net_migration_rate', 'population_change_rate'],
    body: [
      p('Eurostat breaks the year-on-year change in a country\'s population into two crude rates, each expressed per 1,000 people so countries of different sizes compare fairly.'),
      ul([
        '<strong>Net migration rate</strong> — arrivals minus departures (plus a small statistical adjustment), per 1,000 population. A positive figure means more people moved in than out.',
        '<strong>Population change rate</strong> — the total change in population per 1,000, combining net migration with natural change (births minus deaths).',
      ]),
      h('Why it matters'),
      p('Across most of the EU, natural change has turned negative — more deaths than births — so net migration is now the main thing keeping populations from shrinking. Population is the denominator behind per-capita prosperity and the working-age base that funds pensions and healthcare, which makes these rates a quiet but powerful driver of the public finances tracked elsewhere on this site.'),
      note('These are demographic accounting rates, not a judgement. We show the figure; the interpretation is yours.'),
      p('Source: Eurostat demographics (demo_gind), annual.'),
    ].join(''),
  },
  {
    slug: 'imf-forecasts',
    title: 'IMF forecasts (World Economic Outlook)',
    excerpt: 'Forward-looking projections for growth, inflation, deficits and debt, on a consistent cross-country basis.',
    tags: ['explainer', 'forecasts'],
    metricKeys: ['imf_gdp_growth_forecast_pct', 'imf_inflation_forecast_pct', 'imf_net_lending_forecast_pct_gdp', 'imf_gross_debt_forecast_pct_gdp'],
    body: [
      p('Most of this site reports what has already happened. The IMF\'s World Economic Outlook (WEO) looks ahead, with projections produced on a consistent basis for almost every country in the world — which makes it ideal for fair cross-country comparison.'),
      ul([
        '<strong>GDP growth forecast</strong> — projected real growth.',
        '<strong>Inflation forecast</strong> — projected consumer-price inflation.',
        '<strong>Net lending/borrowing forecast</strong> — the projected budget balance, % of GDP.',
        '<strong>Gross debt forecast</strong> — projected government debt, % of GDP.',
      ]),
      h('How to treat a forecast'),
      p('A projection is not a fact. The IMF revises the WEO twice a year as conditions change, and turning points are often missed. Treat these as the best consistent baseline, not a promise — and the consistent methodology is exactly why we use WEO for comparing the eurozone with the US and Asia.'),
      p('Source: IMF World Economic Outlook, annual (historical and projected).'),
    ].join(''),
  },
];

void [note, ul, h, p]; // helpers referenced above; keep linter quiet if unused vary
