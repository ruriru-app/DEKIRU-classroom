# 地図の出典

Natural Earth vector, 1:110m Admin 0 Countries and Tiny Countries.
取得日: 2026-09-26。Public domain。

- https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
- https://www.naturalearthdata.com/about/terms-of-use/

国・地域の名称、形状、位置は上記のデータに基づく。国境や地域の扱いは
教材としての位置確認を目的とし、領有に関する見解を表すものではない。
日本語名称の別名（米国、英国等）と読みを検索用に補った。

変換: generate-world.cjs。正距円筒図法、中央経線150°E、端30°W。
経度を連続化して左右境界でクリップする。小国は同データの点で表示。
日本の近くに太平洋がある配置で、距離・面積を正確に比較する用途ではない。
