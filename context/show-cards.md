# Show cards

Full-screen cards to hand to a driver, server, or clerk. Large Japanese on top, small English below. Hotel data comes from the itinerary's `STAYS` table `[I]` and should reach the app through `trip.json`, not be typed into the app.

## Taxi cards: "Please take me to this address"

The header line is the same on every hotel card:

> この住所までお願いします。
> *Kono juusho made onegaishimasu.* "Please take me to this address." `[V]`

Hotel cards come from `src/data/trip.json` (`stays`). The public demo uses four well-known hotels as samples; replace them with your own.

- **Which card shows.** Today shows the card for *tonight's* hotel. On a travel day, the card switches at check-in time. Before that, it shows both hotels, with the new one first.
- **Phone number.** Tapping the number dials it. A driver can call the hotel if the address isn't enough.

## Dining cards

| Card | Japanese | English | Tag |
| --- | --- | --- | --- |
| Walk-in | 二名です。予約はしていませんが、席はありますか？ | Two people, no reservation. Do you have seats? | [V] |
| Card OK? | カードで支払いできますか？ | Can we pay by card? | [V] |
| English menu? | 英語のメニューはありますか？ | Do you have an English menu? | [V] |
| Non-smoking | 禁煙席はありますか？ | Do you have non-smoking seats? | [N] |

## Other cards

| Card | Japanese | English | Tag |
| --- | --- | --- | --- |
| Tattoo at the bath | 小さい入れ墨があります。大浴場を利用してもいいですか？貸切風呂はありますか？ | I have a small tattoo. May I use the main bath? Is there a private bath? | [N][V] |
| Call a taxi | タクシーを呼んでいただけますか？ | Could you call a taxi for us? | [V] |
| Write it down | 書いていただけますか？ | Could you write that down? | [V] |
| Ship luggage | この荷物を[hotel]へ送りたいです。 | I'd like to send this bag to [hotel]. | [T][V] |
| Tax-free | 免税でお願いします。パスポートはこちらです。 | Tax-free, please. Here is my passport. | [V] |
| Lost item | [X]をなくしました。届いていませんか？ | I lost my [X]. Has it been turned in? | [V] |
