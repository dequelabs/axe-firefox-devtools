/* ! aXe-firefox-devtools
 * Copyright (c) 2015 Deque Systems, Inc.
 *
 * Your use of this Source Code Form is subject to the terms of the Mozilla
 * Public License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This entire copyright notice must appear in every copy of this file you
 * distribute or in any file that contains substantial portions of this source
 * code.
 */

/* global self, axe */

"use strict";

(function () {
  if (document.defaultView.top != document.defaultView) {
    return;
  }

  /*
   * aXe communicator
   */
  self.port.on("axe.analyze", function () {
    axe.a11yCheck(document, function (results) {
      self.port.emit("results", results);
    });
  });
  self.port.emit("attach", {});
}());
