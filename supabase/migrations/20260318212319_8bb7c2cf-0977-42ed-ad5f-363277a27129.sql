
-- Fix existing titular beneficiary amounts: set to sale.total_amount minus sum of adherent amounts
UPDATE beneficiaries b
SET amount = sub.correct_amount
FROM (
  SELECT 
    bt.id AS titular_id,
    GREATEST(
      COALESCE(s.total_amount, 0) - COALESCE(adh.adherent_sum, 0),
      0
    ) AS correct_amount
  FROM beneficiaries bt
  JOIN sales s ON s.id = bt.sale_id
  LEFT JOIN (
    SELECT sale_id, SUM(amount) AS adherent_sum
    FROM beneficiaries
    WHERE (is_primary = false OR is_primary IS NULL)
      AND LOWER(COALESCE(relationship, '')) != 'titular'
    GROUP BY sale_id
  ) adh ON adh.sale_id = bt.sale_id
  WHERE (bt.is_primary = true OR LOWER(COALESCE(bt.relationship, '')) = 'titular')
    AND bt.amount != GREATEST(COALESCE(s.total_amount, 0) - COALESCE(adh.adherent_sum, 0), 0)
    AND s.total_amount > 0
) sub
WHERE b.id = sub.titular_id;
