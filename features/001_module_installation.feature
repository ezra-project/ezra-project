#  This file is part of Ezra Bible App.
#
#  Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>
#
#  Ezra Bible App is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 2 of the License, or
#  (at your option) any later version.
#
#  Ezra Bible App is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with Ezra Bible App. See the file LICENSE.
#  If not, see <http://www.gnu.org/licenses/>.

# features/002_module_installation.feature

Feature: Module installation
  In order to study bible text
  I first install a bible module

  @no-kjv-needed @stop-after
  Scenario: ASV installation
    Given I open the module installation assistant
    And I choose to add translations
    And the repository update date matches today
    And I select the English language
    And I select the CrossWire repository
    And I select the ASV module for installation

    When the installation is completed

    Then the ASV is available as a local module
    And the relevant buttons in the menu are enabled