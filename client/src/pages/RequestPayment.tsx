import React from 'react'
import TopNav from '../components/top-nav/TopNav'
import RequestPaymentTable from '../components/table/RequestPaymentTable'

const RequestPayment = () => {
  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
      <TopNav page="Request Payment" />
      <RequestPaymentTable isHistoryPage={true} />
    </main>
  )
}

export default RequestPayment