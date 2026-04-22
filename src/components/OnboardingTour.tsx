import introJs from 'intro.js'
import { useEffect } from 'react'

interface Props {
  onComplete: () => void
}

export function OnboardingTour({ onComplete }: Props) {
  useEffect(() => {
    const tour = introJs()
    tour.setOptions({
      steps: [
        {
          title: 'Welcome to Forex Sensei 👋',
          intro:
            'This is your personal forex learning companion, built just for you. Let me show you around in 30 seconds.',
        },
        {
          element: '[data-tour="dashboard"]',
          title: 'Dashboard',
          intro:
            'Your home screen. See how many trades you have logged, how many are open, and when you last made an entry. A quick 10-second read of where things stand.',
          position: 'bottom',
        },
        {
          element: '[data-tour="journal"]',
          title: 'Trade Journal',
          intro:
            'Log every trade idea here — before you enter, not after. The most important field is "Why do I think this?" Write your reasoning every time. This is the habit that builds real trading intuition.',
          position: 'bottom',
        },
        {
          element: '[data-tour="decoder"]',
          title: 'Headline Decoder',
          intro:
            'Paste any news headline — RBI policy, oil prices, US Fed, trade wars — and get a plain-language explanation of how it affects the rupee. Analysis is grounded on live USD/INR rates, WTI crude prices, and current news fetched in real time.',
          position: 'bottom',
        },
        {
          element: '[data-tour="performance"]',
          title: 'Performance Tracker',
          intro:
            'Close your trades here and track your win rate over time. The pattern analysis will show you which type of macro calls you get right most often — energy calls, central bank calls, or trade policy calls.',
          position: 'bottom',
        },
        {
          element: '[data-tour="charts"]',
          title: 'Chart Companion',
          intro:
            'Take a screenshot of any chart from Kite or Zerodha and upload it here. AI will identify the chart pattern and explain it in plain language — no jargon.',
          position: 'bottom',
        },
        {
          element: '[data-tour="guided-tour"]',
          title: 'This Button',
          intro:
            'You can replay this tour anytime by clicking "Guided Tour" in the nav bar. Use it whenever you want a refresher on what each section does.',
          position: 'bottom',
        },
        {
          title: "You're all set, Rajesh!",
          intro:
            'Start by logging your first trade in the Journal. Remember — write your reasoning before you enter. Good luck!',
        },
      ],
      showProgress:        true,
      showBullets:         false,
      exitOnOverlayClick:  false,
      doneLabel:           "Let's go →",
      nextLabel:           'Next →',
      prevLabel:           '← Back',
      disableInteraction:  false,
    })

    tour.oncomplete(() => {
      localStorage.setItem('tourCompleted', 'true')
      onComplete()
    })

    tour.onexit(() => {
      localStorage.setItem('tourCompleted', 'true')
      onComplete()
    })

    tour.start()

    return () => { tour.exit() }
  }, [onComplete])

  return null
}
