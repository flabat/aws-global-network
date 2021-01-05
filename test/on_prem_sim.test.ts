import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as OnPremSim from '../lib/on_prem_sim-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new OnPremSim.OnPremSimStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
