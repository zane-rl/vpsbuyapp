import type { VpsExpense } from "@prisma/client";
import { formatDate } from "@/lib/dates";
import { money } from "@/lib/money";
import ExpenseForm from "@/app/admin/vps/[id]/ExpenseForm";
import ExpenseDeleteButton from "@/app/admin/vps/[id]/ExpenseDeleteButton";
import ProofThumb from "@/app/ProofThumb";

export default function VpsExpenseSection({ vpsId, expenses, editable = false }: {
  vpsId: string;
  expenses: VpsExpense[];
  editable?: boolean;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">其他费用</h2>
      <p className="mb-4 mt-2 text-xs text-slate-500 dark:text-slate-400">计入客户总成本与总实付，参与收款差额结算。</p>
      {editable && <ExpenseForm vpsId={vpsId} />}
      {expenses.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">暂无其他费用记录</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="table-head">
              <th className="py-2 pr-4">费用时间</th>
              <th className="py-2 pr-4">费用类型</th>
              <th className="py-2 pr-4 text-right">成本 $</th>
              <th className="py-2 pr-4 text-right">实付 ¥</th>
              <th className="py-2 pr-4">截图</th>
              <th className="py-2 pr-4">备注</th>
              {editable && <th className="py-2">操作</th>}
            </tr></thead>
            <tbody>{expenses.map((expense) => (
              <tr key={expense.id} className="table-row">
                <td className="whitespace-nowrap py-2.5 pr-4 text-slate-600 dark:text-slate-300">{formatDate(expense.expenseDate)}</td>
                <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">{expense.expenseType}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums">${money(expense.costUsd)}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums">¥{money(expense.paidCny)}</td>
                <td className="py-2.5 pr-4"><ProofThumb proof={expense.paymentProof} alt={`${expense.expenseType}付款截图`} /></td>
                <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{expense.notes || "-"}</td>
                {editable && <td className="py-2.5 text-right"><ExpenseDeleteButton expenseId={expense.id} /></td>}
              </tr>
            ))}</tbody>
            <tfoot><tr className="font-semibold">
              <td colSpan={2} className="pt-3">共 {expenses.length} 笔</td>
              <td className="pt-3 pr-4 text-right tabular-nums">${money(expenses.reduce((sum, expense) => sum + expense.costUsd, 0))}</td>
              <td className="pt-3 pr-4 text-right tabular-nums">¥{money(expenses.reduce((sum, expense) => sum + expense.paidCny, 0))}</td>
              <td colSpan={editable ? 3 : 2} />
            </tr></tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
